import { fetchChatListApi } from "@/apis/chat";
import ChatMsg from "@/components/chat-msg";
import ChatUtils from "@/components/chat-utils";
import ImgContainer from "@/components/img-container";
import SearchBar from "@/components/search-bar";
import useToast from "@/hooks/use-toast";
import useUserInfoStore from "@/store/user-info";
import { IChatItem, IMsg, ISendMsg } from "@/types/chat";
import { IFriendExt } from "@/types/friend";
import { IGroupExt } from "@/types/group";
import { BaseState } from "@/utils/constants";
import { fmtTime4list } from "@/utils/fmt";
import { MessageEmoji } from "@icon-park/react";
import { Empty } from "antd";
import { useEffect, useImperativeHandle, useRef, useState } from "react";

export interface IChatRef {
  fetchChatList: () => void;
}

interface IProps {
  ref: React.Ref<IChatRef>;
  initialChat: IFriendExt | IGroupExt | null;
}

const friendOrGroup = (item: IFriendExt | IGroupExt): item is IFriendExt =>
  "friendId" in item && item.friendId !== undefined;

const friendOrGroup2 = (item: IChatItem): item is IChatItem =>
  "receiverEmail" in item && item.receiverEmail !== undefined;

const Chat: React.FC<IProps> = ({ ref, initialChat }: IProps) => {
  const toast = useToast();
  const userInfoStore = useUserInfoStore();
  const userInfo = userInfoStore.userInfo;
  const [chatList, setChatList] = useState<IChatItem[]>([]);
  const [curChat, setCurChat] = useState<IChatItem>();
  const socket = useRef<WebSocket | null>(null);
  const [historyMsgList, setHistoryMsgList] = useState<IMsg[]>([]);
  const [newMsgList, setNewMsgList] = useState<IMsg[]>([]);

  const [inputHeight, setInputHeight] = useState(200);
  const isDraggingRef = useRef(false);

  const handleMouseDown = () => {
    isDraggingRef.current = true;
    document.body.style.cursor = "row-resize";
    document.body.style.userSelect = "none";
  };

  useEffect(() => {
    const handleMouseMove = (e: MouseEvent) => {
      if (!isDraggingRef.current) return;
      const newHeight = window.innerHeight - e.clientY;
      setInputHeight(Math.min(Math.max(newHeight, 100), 500));
    };

    const handleMouseUp = () => {
      if (isDraggingRef.current) {
        isDraggingRef.current = false;
        document.body.style.cursor = "default";
        document.body.style.userSelect = "auto";
      }
    };

    document.addEventListener("mousemove", handleMouseMove);
    document.addEventListener("mouseup", handleMouseUp);

    return () => {
      document.removeEventListener("mousemove", handleMouseMove);
      document.removeEventListener("mouseup", handleMouseUp);
    };
  }, []);

  const connWs = (params: { roomKey: string; senderId: number; type: string }) => {
    const { roomKey, senderId, type } = params;
    if (socket.current) {
      socket.current.close();
      socket.current = null;
    }
    const ws = new WebSocket(
      `${import.meta.env.VITE_WS_BASE_URL}/chat/conn?roomKey=${roomKey}&id=${senderId}&type=${type}`,
    );

    ws.onmessage = (ev) => {
      const msgData = JSON.parse(ev.data);
      if (Array.isArray(msgData)) {
        setHistoryMsgList(msgData);
      } else if (msgData.code !== undefined) {
        toast.error(msgData.msg || "会话失效");
      } else {
        setNewMsgList((oldMsgList) => [...oldMsgList, msgData]);
      }
    };

    ws.onerror = () => toast.error("网络连接失败");
    socket.current = ws;
  };

  const fetchChatList = async () => {
    try {
      const res = await fetchChatListApi();
      if (res.code === BaseState.Ok) {
        setChatList(res.data);
      } else {
        toast.error("获取聊天列表失败");
      }
    } catch (err) {
      console.error(err);
      toast.error("获取聊天列表失败");
    }
  };

  useEffect(() => {
    (async () => {
      try {
        const res = await fetchChatListApi();
        if (res.code !== BaseState.Ok) {
          toast.error("获取聊天列表失败");
          return;
        }
        const chatList = res.data;
        setChatList(chatList);
        if (initialChat) {
          const targetIdx = chatList.findIndex((item) => item.roomKey === initialChat.roomKey);
          if (targetIdx > -1) {
            setCurChat(chatList[targetIdx]);
          } else {
            const newChat: IChatItem = {
              receiverId: 0,
              name: "",
              roomKey: initialChat.roomKey,
              updatedAt: new Date().toISOString(),
              unreadCnt: 0,
              latestMsg: "消息记录为空",
              mediaType: "text",
              avatar: initialChat.avatar,
            };
            if (friendOrGroup(initialChat)) {
              newChat.receiverId = initialChat.friendUserId;
              newChat.name = initialChat.noteName;
              newChat.receiverEmail = initialChat.email;
            } else {
              newChat.receiverId = initialChat.id;
              newChat.name = initialChat.name;
            }
            setChatList([newChat, ...chatList]);
            setCurChat(newChat);
          }
          const params = {
            roomKey: initialChat.roomKey,
            senderId: userInfo.id,
            type: friendOrGroup(initialChat) ? "friend" : "group",
          };
          connWs(params);
        }
      } catch (err) {
        console.error(err);
        toast.error("获取消息列表失败");
      }
    })();

    return () => {
      socket.current?.close();
    };
  }, []);

  const handleClickChat = (item: IChatItem) => {
    setHistoryMsgList([]);
    setNewMsgList([]);
    setCurChat(item);
    const params = {
      roomKey: item.roomKey,
      senderId: userInfo.id,
      type: friendOrGroup2(item) ? "friend" : "group",
    };
    connWs(params);
    fetchChatList();
  };

  useImperativeHandle(ref, () => {
    return { fetchChatList };
  });

  const doSend = (msg: ISendMsg) => {
    socket.current?.send(JSON.stringify(msg));
    fetchChatList();
  };

  return (
    <div className="flex h-dvh w-full">
      <div className="border-surface-200 flex w-80 shrink-0 flex-col border-r bg-white">
        <div className="p-4">
          <SearchBar />
        </div>
        <div className="flex-1 overflow-auto">
          {chatList.length === 0 ? (
            <Empty className="mt-10" description="暂无聊天" />
          ) : (
            chatList.map((chat) => (
              <div
                key={chat.roomKey}
                onClick={() => handleClickChat(chat)}
                className={`flex cursor-pointer items-center gap-3 px-4 py-3 transition-colors duration-150 ${
                  curChat?.roomKey === chat.roomKey ? "bg-primary-50" : "hover:bg-surface-50"
                }`}
              >
                <div className="relative shrink-0">
                  <ImgContainer src={chat.avatar} className="h-12 w-12 rounded-xl object-cover" />
                  {chat.unreadCnt !== 0 && (
                    <div className="absolute -top-1 -right-1 flex h-5 min-w-5 items-center justify-center rounded-full bg-red-500 px-1 text-[10px] font-semibold text-white shadow-sm">
                      {chat.unreadCnt > 99 ? "99+" : chat.unreadCnt}
                    </div>
                  )}
                </div>
                <div className="min-w-0 flex-1">
                  <div className="flex items-center justify-between">
                    <span className="text-surface-800 truncate text-sm font-medium">
                      {chat.name}
                    </span>
                    <span className="text-surface-400 ml-2 shrink-0 text-xs">
                      {fmtTime4list(chat.updatedAt)}
                    </span>
                  </div>
                  <div className="text-surface-400 mt-0.5 truncate text-sm">
                    {(() => {
                      switch (chat.mediaType) {
                        case "text":
                          return chat.latestMsg;
                        case "image":
                          return "[图片]";
                        case "video":
                          return "[视频]";
                        case "file":
                          return "[文件]";
                        default:
                          return "";
                      }
                    })()}
                  </div>
                </div>
              </div>
            ))
          )}
        </div>
      </div>

      <div className="bg-surface-50 flex flex-1 flex-col overflow-hidden">
        {curChat ? (
          <div className="flex h-dvh flex-col">
            <div className="border-surface-200 flex h-14 shrink-0 items-center border-b bg-white px-6">
              <span className="text-surface-800 text-base font-medium">{curChat.name}</span>
            </div>
            <div className="flex-1 overflow-auto p-5">
              <ChatMsg historyMsgList={historyMsgList} newMsgList={newMsgList} />
            </div>
            <div
              className="border-surface-200 border-t bg-white"
              style={{ height: `${inputHeight}px` }}
            >
              <ChatUtils curChat={curChat} doSend={doSend} onMouseDownResize={handleMouseDown} />
            </div>
          </div>
        ) : (
          <div className="flex h-dvh flex-col items-center justify-center gap-4">
            <MessageEmoji theme="filled" size="120" fill="#fbcfe8" strokeWidth={2} />
            <span className="text-surface-400 text-sm">选择一个聊天开始对话</span>
          </div>
        )}
      </div>
    </div>
  );
};

export default Chat;
