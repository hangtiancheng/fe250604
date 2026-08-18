import SearchBar from "@/components/search-bar";
import useToast from "@/hooks/use-toast";
import useUserInfoStore from "@/store/user-info";
import type { IFriendExt, ITaggedFriends } from "@/types/friend";
import type { IGroupExt, IGroupItem } from "@/types/group";
import type { ITagItem } from "@/types/friend";
import {
  Button,
  Empty,
  Form,
  Input,
  Modal,
  Popconfirm,
  Select,
  Tabs,
  TabsProps,
  Tooltip,
} from "antd";
import { useCallback, useEffect, useImperativeHandle, useMemo, useState } from "react";
import ImgContainer from "@/components/img-container";
import {
  addTagApi,
  deleteFriendApi,
  fetchFriendByIdApi,
  fetchFriendListApi,
  fetchTagListApi,
  updateFriendApi,
} from "@/apis/friend";
import { BaseState } from "@/utils/constants";
import type { DataNode, DirectoryTreeProps, EventDataNode } from "antd/es/tree";
import { fetchGroupByIdApi, fetchGroupListApi } from "@/apis/group";
import DirectoryTree from "antd/es/tree/DirectoryTree";
import { MessageEmoji } from "@icon-park/react";
import CreateGroupModal from "@/components/create-group-modal";

export interface IContactRef {
  fetchFriendList: () => void;
  fetchGroupList: () => void;
}

interface IProps {
  ref: React.Ref<IContactRef>;
  doChat: (chat: IFriendExt | IGroupExt) => void;
}

const Contact: React.FC<IProps> = ({ ref, doChat }: IProps) => {
  const userInfoStore = useUserInfoStore();
  const userInfo = userInfoStore.userInfo;
  const toast = useToast();

  const [curTab, setCurTab] = useState<string>("friend");
  const [friendList, setFriendList] = useState<ITaggedFriends[]>([]);
  const [curFriend, setCurFriend] = useState<IFriendExt | null>(null);
  const [tagList, setTagList] = useState<ITagItem[]>([]);
  const [friendFormInst] = Form.useForm<{
    email: string;
    username: string;
    noteName: string;
    tagId: number;
  }>();
  const [addTagFormInst] = Form.useForm<{ tagName: string }>();

  const [mountAddTagModal, setMountAddTagModal] = useState(false);
  const [newTagName, setNewTagName] = useState("");
  const [groupList, setGroupList] = useState<IGroupItem[]>([]);
  const [curGroup, setCurGroup] = useState<IGroupExt | null>(null);
  const [mountCreateGroupModal, setMountCreateGroupModal] = useState(false);

  const treeData = friendList.map((taggedFriends) => {
    return {
      key: taggedFriends.tagName,
      title: (
        <div className="flex items-center justify-between py-1.5">
          <span className="text-surface-600 text-sm font-medium">{taggedFriends.tagName}</span>
          <span className="text-surface-400 text-xs">
            {taggedFriends.onlineCnt} / {taggedFriends.friends.length}
          </span>
        </div>
      ),
      selectable: false,
      children: taggedFriends.friends.map((friend) => ({
        key: friend.id,
        title: (
          <div className="flex items-center justify-between rounded-lg px-2 py-1.5 transition-colors">
            <div className="flex items-center gap-3">
              <ImgContainer
                src={friend.avatar}
                className="h-9 w-9 shrink-0 rounded-lg object-cover"
              />
              <span className="text-surface-700 text-sm">{friend.noteName}</span>
            </div>
            <span
              className={`inline-flex items-center gap-1 text-xs ${
                friend.state === "online" ? "text-emerald-500" : "text-surface-400"
              }`}
            >
              <span
                className={`h-1.5 w-1.5 rounded-full ${
                  friend.state === "online" ? "bg-emerald-500" : "bg-surface-300"
                }`}
              />
              {friend.state === "online" ? "在线" : "离线"}
            </span>
          </div>
        ),
        isLeaf: true,
      })),
    };
  });

  const _fetchFriendById = useCallback(
    async (keyId: number) => {
      try {
        const res = await fetchFriendByIdApi(keyId);
        if (res.code === BaseState.Ok && res.data) {
          setCurFriend(res.data);
          friendFormInst.setFieldsValue({
            email: res.data.email,
            username: res.data.username,
            noteName: res.data.noteName,
            tagId: res.data.tagId,
          });
        } else {
          toast.error("获取好友详情失败");
        }
      } catch (err) {
        console.error(err);
        toast.error("获取好友详情失败");
      }
    },
    [toast, friendFormInst],
  );

  const handleSelectFriend: DirectoryTreeProps["onSelect"] = useCallback(
    (
      _selectedKeys: React.Key[],
      info: {
        node: EventDataNode<DataNode>;
      },
    ) => {
      _fetchFriendById(Number(info.node.key));
    },
    [_fetchFriendById],
  );

  const _fetchGroupById = useCallback(
    async (groupId: number) => {
      try {
        const res = await fetchGroupByIdApi(groupId);
        if (res.code === BaseState.Ok) {
          setCurGroup(res.data);
        } else {
          toast.error("获取群聊详情失败");
        }
      } catch (err) {
        console.error(err);
        toast.error("获取群聊详情失败");
      }
    },
    [toast],
  );

  const handleClickGroup = useCallback(
    async (item: IGroupItem) => {
      _fetchGroupById(item.id);
    },
    [_fetchGroupById],
  );

  const fetchFriendList = useCallback(async () => {
    try {
      const [res] =
        curFriend && curFriend.id
          ? await Promise.all([fetchFriendListApi(), _fetchFriendById(curFriend.id)])
          : [await fetchFriendListApi()];
      if (res.code === BaseState.Ok && res.data) {
        setFriendList(res.data);
      }
    } catch (err) {
      console.error(err);
      toast.error("获取好友列表失败");
    }
  }, [_fetchFriendById, curFriend, toast]);

  const _fetchTagList = async () => {
    try {
      const res = await fetchTagListApi();
      if (res.code === BaseState.Ok && res.data) {
        setTagList(res.data);
      } else {
        toast.error("获取标签列表");
      }
    } catch (err) {
      console.error(err);
      toast.error("获取标签列表失败");
    }
  };

  const updateFriend = () => {
    friendFormInst.validateFields().then(async (values) => {
      try {
        const params = {
          friendId: curFriend!.friendId,
          noteName: values.noteName ? values.noteName : curFriend!.email,
          tagId: values.tagId,
        };
        const res = await updateFriendApi(params);
        if (res.code === BaseState.Ok) {
          toast.success("更新好友详情成功");
          fetchFriendList();
        } else {
          toast.error("更新好友详情失败");
        }
      } catch (err) {
        console.error(err);
        toast.error("更新好友详情失败");
      }
    });
  };

  const deleteFriend_ = async () => {
    if (!curFriend) {
      return;
    }
    try {
      const res = await deleteFriendApi(curFriend.friendId);
      if (res.code === BaseState.Ok) {
        toast.success("删除好友成功");
        setCurFriend(null);
        fetchFriendList();
      } else {
        toast.error("删除好友失败");
      }
    } catch (err) {
      console.error(err);
      toast.error("删除好友失败");
    }
  };

  const addTag = async () => {
    if (!newTagName) {
      toast.warning("请输入标签名");
      return;
    }
    try {
      const params = {
        userId: userInfo.id,
        userEmail: userInfo.email,
        name: newTagName,
      };
      const res = await addTagApi(params);
      if (res.code === BaseState.Ok) {
        toast.success("新建标签成功");
        fetchFriendList();
        _fetchTagList();
        setMountAddTagModal(false);
      } else {
        toast.error("新建标签失败");
      }
    } catch (err) {
      console.error(err);
      toast.error("新建标签失败");
    }
  };

  const fetchGroupList = useCallback(async () => {
    try {
      const [res] =
        curGroup && curGroup.id
          ? await Promise.all([fetchGroupListApi(), _fetchGroupById(curGroup.id)])
          : [await fetchGroupListApi()];
      if (res.code === BaseState.Ok) {
        setGroupList(res.data);
      } else {
        toast.error("获取群聊列表失败");
      }
    } catch (err) {
      console.error(err);
      toast.error("获取群聊列表失败");
    }
  }, [_fetchGroupById, curGroup, toast]);

  const CtxMenu = useCallback(
    (tabKey: "friend" | "group") => {
      return tabKey === "friend" ? (
        <ul className="cursor-pointer text-sm">
          <li className="hover:bg-surface-100 rounded px-2 py-1" onClick={fetchFriendList}>
            刷新好友列表
          </li>
          <li
            className="hover:bg-surface-100 rounded px-2 py-1"
            onClick={() => setMountAddTagModal(true)}
          >
            新建标签
          </li>
        </ul>
      ) : (
        <ul className="cursor-pointer text-sm">
          <li className="hover:bg-surface-100 rounded px-2 py-1" onClick={fetchGroupList}>
            刷新群聊列表
          </li>
        </ul>
      );
    },
    [fetchFriendList, fetchGroupList],
  );

  const TabLabel = useCallback(
    (tabKey: "friend" | "group") => {
      return (
        <Tooltip
          placement="bottomLeft"
          title={CtxMenu(tabKey)}
          arrow={false}
          trigger={"contextMenu"}
        >
          {tabKey === "friend" ? "好友" : "群聊"}
        </Tooltip>
      );
    },
    [CtxMenu],
  );

  const tabItems: TabsProps["items"] = useMemo(
    () => [
      {
        key: "friend",
        label: TabLabel("friend"),
        children:
          treeData.length === 0 ? (
            <Empty className="mt-8" description="暂无好友" />
          ) : (
            <DirectoryTree
              onSelect={handleSelectFriend}
              treeData={treeData}
              icon={null}
              showIcon={false}
              className="w-full [&_.ant-tree.ant-tree-directory_.ant-tree-treenode-selected]:bg-transparent"
            />
          ),
      },
      {
        key: "group",
        label: TabLabel("group"),
        children:
          groupList.length === 0 ? (
            <Empty className="mt-8" description="暂无群聊" />
          ) : (
            <div className="flex flex-col gap-1">
              {groupList.map((item) => (
                <div
                  key={item.id}
                  onClick={() => handleClickGroup(item)}
                  className={`flex cursor-pointer items-center gap-3 rounded-xl px-3 py-2.5 transition-colors duration-150 ${
                    curGroup?.id === item.id ? "bg-primary-50" : "hover:bg-surface-50"
                  }`}
                >
                  <ImgContainer
                    src={item.avatar}
                    className="h-10 w-10 shrink-0 rounded-lg object-cover"
                  />
                  <span className="text-surface-700 truncate text-sm">{item.name}</span>
                </div>
              ))}
            </div>
          ),
      },
    ],
    [TabLabel, groupList, handleClickGroup, handleSelectFriend, treeData, curGroup],
  );

  const subTabItems: TabsProps["items"] = [
    {
      key: "groupIndex",
      label: "群聊主页",
      children: (
        <div className="text-surface-600 space-y-2 text-sm">
          <div>群主: {curGroup?.creatorEmail}</div>
          <div>群聊人数: {curGroup?.memberList.length}</div>
          <div>创建时间: {curGroup?.createdAt.split(".")[0].replace("T", " ")}</div>
        </div>
      ),
    },
    {
      key: "groupDetail",
      label: "群聊详情",
      children: (
        <div className="border-surface-200 overflow-hidden rounded-lg border">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-surface-200 bg-surface-50 border-b">
                <th className="text-surface-600 px-3 py-2 text-left font-medium">用户名</th>
                <th className="text-surface-600 px-3 py-2 text-left font-medium">群昵称</th>
                <th className="text-surface-600 px-3 py-2 text-left font-medium">加入时间</th>
                <th className="text-surface-600 px-3 py-2 text-left font-medium">最后发言</th>
              </tr>
            </thead>
            <tbody>
              {curGroup?.memberList.map((item) => (
                <tr key={item.userId} className="border-surface-100 border-b last:border-0">
                  <td className="text-surface-700 px-3 py-2">{item.username}</td>
                  <td className="text-surface-700 px-3 py-2">{item.nickname}</td>
                  <td className="text-surface-500 px-3 py-2">
                    {item.createdAt.split(".")[0].replace("T", " ")}
                  </td>
                  <td className="text-surface-500 px-3 py-2">
                    {item.latestMsgTime?.split(".")[0].replace("T", " ") || "无"}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      ),
    },
  ];

  useEffect(() => {
    fetchFriendList();
    _fetchTagList();
    fetchGroupList();
  }, []);

  useEffect(() => {
    switch (curTab) {
      case "friend":
        setCurGroup(null);
        break;
      case "group":
        setCurFriend(null);
        break;
    }
  }, [curTab]);

  useImperativeHandle(ref, () => {
    return {
      fetchFriendList,
      fetchGroupList,
    };
  });

  const LeftContainer = useMemo(
    () => (
      <div className="border-surface-200 flex w-80 shrink-0 flex-col border-r bg-white">
        <div className="p-4">
          <SearchBar />
        </div>
        <div className="flex-1 overflow-auto px-3 pb-3">
          <Tabs
            centered
            defaultActiveKey="friend"
            items={tabItems}
            onChange={(tabKey: string) => setCurTab(tabKey)}
          />
        </div>
      </div>
    ),
    [tabItems],
  );

  return (
    <div className="flex h-dvh w-full">
      {LeftContainer}
      <div className="bg-surface-50 flex h-dvh flex-1 flex-col items-center justify-center overflow-auto p-8">
        {curTab === "friend" && curFriend && (
          <div className="border-surface-200 shadow-card w-full max-w-2xl rounded-2xl border bg-white p-8">
            <div className="border-surface-100 mb-8 flex items-center gap-5 border-b pb-8">
              <ImgContainer
                src={curFriend.avatar}
                className="h-20 w-20 shrink-0 rounded-2xl object-cover shadow-sm"
              />
              <div className="min-w-0 flex-1">
                <div className="text-surface-800 text-xl font-semibold">
                  {curFriend.noteName || curFriend.username}
                </div>
                <div className="text-surface-500 mt-1 text-sm">{curFriend.email}</div>
                <div className="text-surface-400 mt-0.5 text-sm">
                  {curFriend.signature ?? "这个人很神秘, 没有签名"}
                </div>
              </div>
            </div>
            <div className="px-2">
              <Form form={friendFormInst} layout="horizontal" labelCol={{ span: 4 }}>
                <Form.Item label="邮箱" colon={false} name="email">
                  <Input readOnly variant="borderless" className="text-surface-500 px-0" />
                </Form.Item>
                <Form.Item label="用户名" colon={false} name="username">
                  <Input readOnly variant="borderless" className="text-surface-500 px-0" />
                </Form.Item>
                <Form.Item label="备注" colon={false} name="noteName">
                  <Input placeholder="请输入备注" />
                </Form.Item>
                <Form.Item label="标签" colon={false} name="tagId">
                  <Select
                    notFoundContent="没有标签"
                    placeholder="请选择标签"
                    options={tagList.map((item) => ({
                      label: item.name,
                      value: item.id,
                    }))}
                  />
                </Form.Item>
              </Form>
              <div className="border-surface-100 mt-8 flex justify-center gap-4 border-t pt-6">
                <Popconfirm
                  title="删除好友"
                  description="确定删除吗?"
                  okText="删除"
                  cancelText="取消"
                  okButtonProps={{ danger: true }}
                  onConfirm={deleteFriend_}
                >
                  <Button danger className="w-28">
                    删除好友
                  </Button>
                </Popconfirm>
                <Button className="w-28" onClick={updateFriend}>
                  更新资料
                </Button>
                <Button type="primary" className="w-28" onClick={() => doChat(curFriend)}>
                  发消息
                </Button>
              </div>
            </div>
          </div>
        )}
        {curTab === "group" && curGroup && (
          <div className="border-surface-200 shadow-card w-full max-w-2xl rounded-2xl border bg-white p-8">
            <div className="border-surface-100 mb-8 flex items-center gap-5 border-b pb-8">
              <ImgContainer
                src={curGroup.avatar}
                className="h-20 w-20 shrink-0 rounded-2xl object-cover shadow-sm"
              />
              <div className="min-w-0 flex-1">
                <div className="text-surface-800 text-xl font-semibold">{curGroup.name}</div>
                <div className="text-surface-400 mt-1 text-sm">
                  {curGroup.readme ?? "这个群很神秘, 没有群公告"}
                </div>
              </div>
            </div>
            <div className="px-2">
              <Tabs centered defaultActiveKey={"groupIndex"} items={subTabItems} className="mb-6" />
            </div>
            <div className="border-surface-100 mt-6 flex justify-center gap-4 border-t pt-6">
              <Button className="w-28" onClick={() => setMountCreateGroupModal(true)}>
                邀请好友
              </Button>
              <Button type="primary" className="w-28" onClick={() => doChat(curGroup)}>
                发消息
              </Button>
            </div>
          </div>
        )}
        {!curFriend && !curGroup && (
          <div className="flex flex-col items-center gap-4">
            <MessageEmoji theme="filled" size="120" fill="#c7d2fe" strokeWidth={2} />
            <span className="text-surface-400 text-sm">选择一个好友或群聊查看详情</span>
          </div>
        )}
      </div>
      {mountAddTagModal && (
        <Modal
          title="新建标签"
          open={mountAddTagModal}
          onCancel={() => setMountAddTagModal(false)}
          onOk={() => addTag()}
          cancelText="取消"
          okText="确定"
        >
          <Form name="addTagForm" form={addTagFormInst} className="mt-4">
            <Form.Item name="tagName">
              <Input placeholder="请输入标签名" onChange={(ev) => setNewTagName(ev.target.value)} />
            </Form.Item>
          </Form>
        </Modal>
      )}
      {mountCreateGroupModal && curGroup && (
        <CreateGroupModal
          mountModal={mountCreateGroupModal}
          curGroup={curGroup}
          setMountModal={setMountCreateGroupModal}
          type="addFriends"
        />
      )}
    </div>
  );
};

export default Contact;
