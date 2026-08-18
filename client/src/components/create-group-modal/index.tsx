import { FriendList, IFriendItem } from "@/types/friend";
import { ICreateGroupDto, IGroupExt } from "@/types/group";
import { Button, Form, Input, Modal, Tree } from "antd";
import { useEffect, useMemo, useRef, useState } from "react";
import ImgContainer from "../img-container";
import useToast from "@/hooks/use-toast";
import { fetchFriendListApi } from "@/apis/friend";
import { BaseState, GroupState } from "@/utils/constants";
import ImgUploader from "../img-uploader";
import { addFriends2groupApi, createGroupApi } from "@/apis/group";

interface IProps {
  mountModal: boolean;
  setMountModal: (newMountModal: boolean) => void;
  type: "addFriends" | "createGroup";
  curGroup?: IGroupExt;
}

const CreateGroupModal: React.FC<IProps> = (props: IProps) => {
  const { mountModal, setMountModal, type, curGroup } = props;
  const toast = useToast();

  const [friendList, setFriendList] = useState<FriendList>([]);
  const [checkedFriendList, setCheckedFriendList] = useState<IFriendItem[]>([]);
  const [friendId2friend, setFriendId2friend] = useState<Record<number, IFriendItem>>({});

  const [isLoading, setIsLoading] = useState(false);
  const [createGroupFormInst] = Form.useForm<{
    groupAvatar: string;
    groupName: string;
    readme: string;
  }>();
  const stepOneRef = useRef<HTMLDivElement | null>(null);
  const stepTwoRef = useRef<HTMLDivElement | null>(null);

  const treeData = friendList.map((taggedFriends) => {
    return {
      title: <span className="text-surface-600 text-sm font-medium">{taggedFriends.tagName}</span>,
      key: taggedFriends.tagName,
      selectable: false,
      disabled: taggedFriends.friends.length === 0,
      children: taggedFriends.friends.map((friend) => ({
        title: (
          <div className="flex items-center gap-3">
            <ImgContainer src={friend.avatar} className="h-8 w-8 rounded-lg object-cover" />
            <span className="text-surface-700 text-sm">{friend.noteName}</span>
          </div>
        ),
        key: friend.id,
        isLeaf: true,
        selectable: false,
      })),
    };
  });

  const fetchFriendList = async () => {
    try {
      const res = await fetchFriendListApi();
      if (res.code === BaseState.Ok && res.data) {
        const friendList = res.data;
        setFriendList(friendList);
        const newFriendId2friend: Record<number, IFriendItem> = {};
        for (const taggedFriends of friendList) {
          for (const friend of taggedFriends.friends) {
            newFriendId2friend[friend.id] = friend;
          }
        }
        setFriendId2friend(newFriendId2friend);
      }
    } catch (err) {
      console.error(err);
      toast.error("获取好友列表失败");
    }
  };

  useEffect(() => {
    fetchFriendList();
  }, []);

  const switchStep = (step: 0 | 1 | 2) => {
    switch (step) {
      case 1:
        if (stepOneRef.current && stepTwoRef.current) {
          stepOneRef.current.style.opacity = "1";
          stepTwoRef.current.style.opacity = "0";
          setTimeout(() => {
            stepOneRef.current!.style.display = "block";
            stepTwoRef.current!.style.display = "none";
          }, 500);
        }
        break;

      case 2:
        if (stepOneRef.current && stepTwoRef.current) {
          if (checkedFriendList.length === 0) {
            toast.error("至少邀请 1 位好友");
            break;
          }
          stepOneRef.current.style.opacity = "0";
          stepTwoRef.current.style.opacity = "1";
          setTimeout(() => {
            stepOneRef.current!.style.display = "none";
            stepTwoRef.current!.style.display = "block";
          }, 500);
        }
        break;
    }
  };

  const FriendsTree = useMemo(() => {
    return (
      <Tree
        checkable
        defaultExpandAll={true}
        treeData={treeData}
        onCheck={(checkedKeys) => {
          const checkedIdList = (checkedKeys as (number | string)[]).map(Number);
          setCheckedFriendList(checkedIdList.map((checkedId) => friendId2friend[checkedId]));
        }}
      />
    );
  }, [friendId2friend, treeData]);

  const handleCreateGroup = async ({
    groupName,
    groupAvatar,
    readme,
  }: Omit<ICreateGroupDto, "memberList">) => {
    if (checkedFriendList.length === 0) {
      toast.error("至少邀请 1 位好友");
      return;
    }
    setIsLoading(true);
    const memberList = checkedFriendList.map((item) => ({
      userId: item.userId,
      email: item.email,
      avatar: item.avatar,
    }));
    try {
      const res = await createGroupApi({
        groupName,
        groupAvatar,
        readme,
        memberList,
      });
      if (res.code === BaseState.Ok) {
        toast.success("创建群聊成功");
        setMountModal(false);
        return;
      } else {
        toast.error("创建群聊失败");
      }
    } catch (err) {
      console.error(err);
    } finally {
      setIsLoading(false);
    }
  };

  const addFriends2group = async () => {
    if (checkedFriendList.length === 0) {
      toast.error("至少邀请 1 位好友");
      return;
    }
    const friendList = checkedFriendList.map((item) => ({
      userId: item.userId,
      email: item.email,
      avatar: item.avatar,
    }));
    try {
      const res = await addFriends2groupApi({
        groupId: curGroup!.id,
        friendList,
      });
      if (res.code === BaseState.Ok) {
        toast.success("邀请成功");
        setMountModal(false);
        return;
      }
      if (res.code === GroupState.FriendJoined) {
        toast.warning("邀请的好友已加入");
      } else {
        toast.error("邀请失败");
      }
    } catch (err) {
      console.error(err);
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <Modal
      title={type === "addFriends" ? "邀请好友" : "创建群聊"}
      open={mountModal}
      onCancel={() => setMountModal(false)}
      footer={null}
      width={560}
    >
      <div ref={stepOneRef} className="mt-4 transition-opacity duration-500">
        <div className="flex gap-6">
          <div className="min-w-0 flex-1">
            <div className="text-surface-600 mb-2 text-sm font-medium">好友列表</div>
            <div className="border-surface-200 max-h-64 overflow-auto rounded-lg border p-2">
              {FriendsTree}
            </div>
          </div>
          <div className="min-w-0 flex-1">
            <div className="text-surface-600 mb-2 text-sm font-medium">
              已选择 ({checkedFriendList.length})
            </div>
            <div className="max-h-64 space-y-1.5 overflow-auto">
              {checkedFriendList.map((item) => (
                <div
                  key={item.id}
                  className="bg-surface-50 flex items-center gap-2.5 rounded-lg px-2.5 py-1.5"
                >
                  <ImgContainer src={item.avatar} className="h-7 w-7 rounded-md object-cover" />
                  <span className="text-surface-700 truncate text-sm">{item.noteName}</span>
                </div>
              ))}
            </div>
          </div>
        </div>
        <div className="mt-4 flex justify-end">
          {type === "addFriends" ? (
            <Button type="primary" onClick={addFriends2group} loading={isLoading}>
              邀请
            </Button>
          ) : (
            <Button type="primary" onClick={() => switchStep(2)}>
              下一步
            </Button>
          )}
        </div>
      </div>

      <div ref={stepTwoRef} className="hidden transition-opacity duration-500">
        <Form form={createGroupFormInst} onFinish={handleCreateGroup} className="mt-4">
          <Form.Item rules={[{ required: true, message: "请上传群聊头像" }]} name="groupAvatar">
            <ImgUploader
              onUploadOk={(filePath) => {
                createGroupFormInst.setFieldsValue({ groupAvatar: filePath });
              }}
            />
          </Form.Item>
          <Form.Item rules={[{ required: true, message: "请输入群聊名" }]} name="groupName">
            <Input maxLength={15} showCount={true} placeholder="群聊名称" />
          </Form.Item>
          <Form.Item name="readme">
            <Input maxLength={30} showCount={true} placeholder="群公告 (可选)" />
          </Form.Item>
          <Form.Item className="mb-0">
            <div className="flex justify-end gap-2">
              <Button onClick={() => switchStep(1)}>上一步</Button>
              <Button type="primary" htmlType="submit" loading={isLoading}>
                创建
              </Button>
            </div>
          </Form.Item>
        </Form>
      </div>
    </Modal>
  );
};

export default CreateGroupModal;
