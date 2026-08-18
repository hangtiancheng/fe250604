import { logoutApi } from "@/apis/user";
import ImgContainer from "@/components/img-container";
import useToast from "@/hooks/use-toast";
import useUserInfoStore from "@/store/user-info";
import useViewStore from "@/store/view";

import type { IChatRef, IContactRef } from "@/types/fc-expose";
import { BaseState } from "@/utils/constants";

import { Button, Popover, Tooltip } from "antd";
import { useEffect, useRef, useState } from "react";
import { IconItem, MenuIconKey, MenuIconList } from "@/utils/icons";

import Chat from "../chat";
import Contact from "../contact";
import PwdModal from "@/components/pwd-modal";
import UserInfoModal from "@/components/user-info-modal";
import AudioModal from "@/components/audio-modal";
import VideoModal from "@/components/video-modal";

import type { IGroupExt } from "@/types/group";
import type { IFriendExt } from "@/types/friend";
import { ICallReceiver } from "@/types/chat";

const Home: React.FC = () => {
  const toast = useToast();
  const viewStore = useViewStore();
  const userInfoStore = useUserInfoStore();
  const userInfo = userInfoStore.userInfo;

  const [curIconKey, setCurIconKey] = useState<MenuIconKey>("MessageEmoji");
  const [mountPwdModal, setMountPwdModal] = useState(false);
  const [mountUserInfoModal, setMountUserInfoModal] = useState(false);
  const [mountAudioModal, setMountAudioModal] = useState(false);
  const [mountVideoModal, setMountVideoModal] = useState(false);
  const [curChat, setCurChat] = useState<IFriendExt | IGroupExt | null>(null);
  const [roomKey, setRoomKey] = useState<string>("");
  const [rtcMode, setRtcMode] = useState<
    "friendAudio" | "groupAudio" | "friendVideo" | "groupVideo"
  >();
  const [callReceiverList, setCallReceiverList] = useState<ICallReceiver[]>([]);

  const webSocket = useRef<WebSocket | null>(null);
  const contactRef = useRef<IContactRef>(null);
  const chatRef = useRef<IChatRef>(null);

  const logout = async () => {
    try {
      const res = await logoutApi(userInfo);
      if (res.code !== BaseState.Ok) {
        toast.error("退出登录失败");
        return;
      }
      userInfoStore.clearUserInfo();
      toast.success("退出登录成功");
      viewStore.setView("login");
      if (webSocket.current !== null) {
        webSocket.current.close();
        webSocket.current = null;
      }
    } catch (err) {
      console.error(err);
      toast.error("退出登录失败");
    }
  };

  const UserInfoContent = (
    <div className="w-72">
      <div className="flex gap-4">
        <ImgContainer
          src={userInfo.avatar}
          className="h-16 w-16 shrink-0 rounded-xl object-cover shadow-sm"
        />
        <div className="flex min-w-0 flex-col justify-center gap-1">
          <div className="text-surface-800 truncate text-base font-medium">{userInfo.username}</div>
          <div className="text-surface-500 truncate text-sm">
            {userInfo.signature?.length ? userInfo.signature : "这个人很神秘, 没有签名"}
          </div>
        </div>
      </div>
      <div className="border-surface-100 mt-4 flex gap-2 border-t pt-4">
        <Button size="small" onClick={() => setMountPwdModal(true)}>
          修改密码
        </Button>
        <Button size="small" onClick={() => setMountUserInfoModal(true)}>
          修改资料
        </Button>
      </div>
    </div>
  );

  const wsSub = () => {
    const ws = new WebSocket(
      `${import.meta.env.VITE_WS_BASE_URL}/user/pub?email=${userInfo.email}`,
    );
    ws.onmessage = (ev) => {
      const msg: {
        type: "wsFetchFriendList" | "wsFetchGroupList" | "wsFetchChatList" | "wsCreateRtcRoom";
        receiverList: ICallReceiver[];
        roomKey: string;
        mode?: "friendAudio" | "groupAudio" | "friendVideo" | "groupVideo";
      } = JSON.parse(ev.data);

      switch (msg.type) {
        case "wsFetchFriendList":
          contactRef.current?.fetchFriendList();
          break;
        case "wsFetchGroupList":
          contactRef.current?.fetchGroupList();
          break;
        case "wsFetchChatList":
          chatRef.current?.fetchChatList();
          break;
        case "wsCreateRtcRoom":
          try {
            const { receiverList, roomKey, mode } = msg;
            if (!mode) {
              console.error("[ws] wsCreateRtcRoom missing mode:", msg);
            }
            setCallReceiverList(receiverList);
            setRtcMode(mode);
            setRoomKey(roomKey);
            if (mode?.toLowerCase().includes("audio")) {
              setMountAudioModal(true);
            }
            if (mode?.toLowerCase().includes("video")) {
              setMountVideoModal(true);
            }
          } catch (err) {
            console.error(err);
            toast.error("音视频聊天失败");
          }
          break;
      }
    };
    webSocket.current = ws;
  };
  useEffect(() => wsSub(), []);

  const handleClickIcon = (item: IconItem) => {
    setCurIconKey(item.key as MenuIconKey);
    if (item.key === "Power") {
      logout();
    }
  };

  const doChat = (chat: IFriendExt | IGroupExt) => {
    setCurIconKey("MessageEmoji");
    setCurChat(chat);
  };

  return (
    <div className="flex h-dvh w-dvw">
      <div className="bg-sidebar flex w-[68px] shrink-0 flex-col items-center justify-between py-5">
        <div className="flex w-full flex-col items-center gap-2">
          <Popover content={UserInfoContent} placement="right" trigger="click">
            <div className="hover:bg-sidebar-hover mb-4 flex cursor-pointer items-center justify-center rounded-xl p-1.5 transition-colors">
              <ImgContainer src={userInfo.avatar} className="h-10 w-10 rounded-lg object-cover" />
            </div>
          </Popover>
          {MenuIconList.slice(0, 5).map((item) => (
            <Tooltip key={item.key} placement="right" title={item.title} arrow={false}>
              <div
                onClick={() => handleClickIcon(item)}
                className={`flex h-11 w-11 cursor-pointer items-center justify-center rounded-xl transition-all duration-200 ${
                  curIconKey === item.key
                    ? "bg-sidebar-active text-primary-300"
                    : "text-surface-500 hover:bg-sidebar-hover hover:text-surface-300"
                }`}
              >
                <item.IconInst size="22" strokeWidth={3} />
              </div>
            </Tooltip>
          ))}
        </div>

        <div className="flex flex-col items-center gap-2">
          {MenuIconList.slice(5).map((item) => (
            <Tooltip key={item.key} placement="right" title={item.title} arrow={false}>
              <div
                onClick={() => handleClickIcon(item)}
                className={`flex h-11 w-11 cursor-pointer items-center justify-center rounded-xl transition-all duration-200 ${
                  item.key === "Power"
                    ? "text-red-400/70 hover:bg-red-500/10 hover:text-red-400"
                    : curIconKey === item.key
                      ? "bg-sidebar-active text-primary-300"
                      : "text-surface-500 hover:bg-sidebar-hover hover:text-surface-300"
                }`}
              >
                <item.IconInst size="22" strokeWidth={3} />
              </div>
            </Tooltip>
          ))}
        </div>
      </div>

      <div className="flex-1 overflow-hidden">
        {(() => {
          switch (curIconKey) {
            case "MessageEmoji":
              return <Chat ref={chatRef} initialChat={curChat} />;
            case "AddressBook":
              return <Contact ref={contactRef} doChat={doChat} />;
          }
        })()}
      </div>

      {mountPwdModal && <PwdModal mountModal={mountPwdModal} setMountModal={setMountPwdModal} />}
      {mountUserInfoModal && (
        <UserInfoModal mountModal={mountUserInfoModal} setMountModal={setMountUserInfoModal} />
      )}
      {mountAudioModal && (
        <AudioModal
          state="receive"
          mountModal={mountAudioModal}
          setMountModal={setMountAudioModal}
          type={rtcMode?.includes("friend") ? "friend" : "group"}
          roomKey={roomKey}
          callReceiverList={callReceiverList}
        />
      )}
      {mountVideoModal && (
        <VideoModal
          state="receive"
          mountModal={mountVideoModal}
          setMountModal={setMountVideoModal}
          type={rtcMode?.includes("friend") ? "friend" : "group"}
          roomKey={roomKey}
          callReceiverList={callReceiverList}
        />
      )}
    </div>
  );
};

export default Home;
