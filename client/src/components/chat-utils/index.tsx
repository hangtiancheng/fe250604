import { fetchGroupMembersApi } from "@/apis/group";
import useToast from "@/hooks/use-toast";
import useUserInfoStore from "@/store/user-info";
import { ICallReceiver, IChatItem, ISendMsg } from "@/types/chat";
import { BaseState } from "@/utils/constants";
import { getFileType } from "@/utils/file";
import { uploadFile } from "@/utils/upload";
import { ChangeEvent, useRef, useState } from "react";
import AudioModal from "../audio-modal";
import VideoModal from "../video-modal";
import { EmojiList } from "@/utils/emoji";
import { MsgIconKey, MsgIconList } from "@/utils/icons";
import { Button, Popover, Spin, Tooltip } from "antd";

interface IProps {
  curChat: IChatItem;
  doSend: (msg: ISendMsg) => void;
  onMouseDownResize?: () => void;
}

const ChatUtils: React.FC<IProps> = (props: IProps) => {
  const { curChat, doSend, onMouseDownResize } = props;
  const toast = useToast();
  const userInfoStore = useUserInfoStore();
  const userInfo = userInfoStore.userInfo;
  const [inputValue, setInputValue] = useState<string>("");
  const [isLoading, setIsLoading] = useState(false);
  const [mountAudioModal, setMountAudioModal] = useState(false);
  const [mountVideoModal, setMountVideoModal] = useState(false);
  const [callReceiverList, setCallReceiverList] = useState<ICallReceiver[]>([]);
  const [showEmojiPicker, setShowEmojiPicker] = useState(false);
  const imgOrVideoInputRef = useRef<HTMLInputElement | null>(null);
  const fileInputRef = useRef<HTMLInputElement | null>(null);

  const handleSelectEmoji = (emoji: string) => {
    setInputValue((prev) => prev + emoji);
    setShowEmojiPicker(false);
  };

  const emojiContent = (
    <div className="grid max-h-52 w-72 grid-cols-8 gap-0.5 overflow-y-auto p-2">
      {EmojiList.map((emoji, idx) => (
        <span
          key={idx}
          className="hover:bg-surface-100 flex h-8 w-8 cursor-pointer items-center justify-center rounded-lg text-lg transition-colors"
          onClick={() => handleSelectEmoji(emoji)}
        >
          {emoji}
        </span>
      ))}
    </div>
  );

  const friendOrGroup = (item: IChatItem) => Boolean(item.receiverEmail);

  const changeInputValue = (ev: ChangeEvent<HTMLTextAreaElement>) => {
    setInputValue(ev.target.value);
  };

  const sendText = () => {
    if (!inputValue || inputValue.length === 0) {
      return;
    }
    const newMsg: ISendMsg = {
      senderId: userInfo.id,
      receiverId: curChat.receiverId,
      mediaType: "text",
      roomKey: curChat.roomKey,
      content: inputValue,
      avatar: userInfo.avatar,
    };
    try {
      doSend(newMsg);
      setInputValue("");
    } catch (err) {
      console.error(err);
      toast.error("消息发送失败");
    }
  };

  const sendFile = async (ev: ChangeEvent<HTMLInputElement>) => {
    if (!ev.target.files || ev.target.files.length === 0) {
      return;
    }
    setIsLoading(true);
    const file = ev.target.files[0];
    if (file.size > 2 * 1024 * 1024 * 1024) {
      toast.error("文件大小不能超过 2G");
      setIsLoading(false);
      return;
    }
    try {
      const ret = await uploadFile(file, 5);
      if (ret.done && ret.filePath) {
        const newMsg: ISendMsg = {
          senderId: userInfo.id,
          receiverId: curChat.receiverId,
          roomKey: curChat.roomKey,
          mediaType: getFileType(file.name),
          content: ret.filePath,
          avatar: userInfo.avatar,
          fileSize: file.size,
        };
        try {
          doSend(newMsg);
        } catch (err) {
          console.error(err);
          toast.error("消息发送失败");
        }
      } else {
        toast.error("文件上传失败");
      }
    } catch (err) {
      console.error(err);
      toast.error("文件上传失败");
    } finally {
      setIsLoading(false);
      imgOrVideoInputRef.current!.value = "";
      fileInputRef.current!.value = "";
    }
  };

  const handleClickIcon = async (key: MsgIconKey) => {
    switch (key) {
      case "WinkingFace":
        setShowEmojiPicker((prev) => !prev);
        break;
      case "PictureAlbum":
        imgOrVideoInputRef.current?.click();
        break;
      case "FileCode":
        fileInputRef.current?.click();
        break;
      case "PhoneTelephone":
        await fetchCalleeList();
        setMountAudioModal(true);
        break;
      case "VideoOne":
        await fetchCalleeList();
        setMountVideoModal(true);
    }
  };

  const fetchCalleeList = async () => {
    if (friendOrGroup(curChat)) {
      setCallReceiverList([
        {
          email: curChat.receiverEmail!,
          alias: curChat.name,
          avatar: curChat.avatar,
        },
      ]);
      return;
    }
    const params = {
      groupId: curChat.receiverId,
      roomKey: curChat.roomKey,
    };
    try {
      const res = await fetchGroupMembersApi(params);
      if (res.code === BaseState.Ok && res.data) {
        setCallReceiverList(
          res.data.map((item) => ({
            email: item.email,
            alias: item.nickname,
            avatar: item.avatar,
          })),
        );
      } else {
        toast.error("获取群聊成员列表失败");
      }
    } catch (err) {
      console.error(err);
      toast.error("获取群聊成员列表失败");
    }
  };

  return (
    <div className="relative flex h-full flex-col px-4 py-3">
      <div
        className="hover:bg-primary-200 absolute top-0 right-0 left-0 z-10 h-1 cursor-row-resize transition-colors"
        onMouseDown={onMouseDownResize}
      />
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-1">
          {MsgIconList.slice(0, 3).map((item) => {
            if (item.key === "WinkingFace") {
              return (
                <Popover
                  key={item.key}
                  content={emojiContent}
                  trigger="click"
                  open={showEmojiPicker}
                  onOpenChange={setShowEmojiPicker}
                  placement="topLeft"
                >
                  <Tooltip placement="top" title={item.title} arrow={false}>
                    <div className="text-surface-500 hover:bg-surface-100 hover:text-surface-700 flex h-8 w-8 cursor-pointer items-center justify-center rounded-lg transition-colors">
                      <item.IconInst size="18" />
                    </div>
                  </Tooltip>
                </Popover>
              );
            }
            return (
              <Tooltip key={item.key} placement="top" title={item.title} arrow={false}>
                <div
                  onClick={() => handleClickIcon(item.key as MsgIconKey)}
                  className="text-surface-500 hover:bg-surface-100 hover:text-surface-700 flex h-8 w-8 cursor-pointer items-center justify-center rounded-lg transition-colors"
                >
                  <item.IconInst size="18" />
                </div>
              </Tooltip>
            );
          })}
        </div>

        <div className="flex items-center gap-1">
          {MsgIconList.slice(3).map((item) => (
            <Tooltip key={item.key} placement="top" title={item.title} arrow={false}>
              <div
                onClick={() => handleClickIcon(item.key as MsgIconKey)}
                className="text-surface-500 hover:bg-surface-100 hover:text-surface-700 flex h-8 w-8 cursor-pointer items-center justify-center rounded-lg transition-colors"
              >
                <item.IconInst size="18" />
              </div>
            </Tooltip>
          ))}
        </div>

        <input
          type="file"
          accept="image/*,video/*"
          ref={imgOrVideoInputRef}
          onChange={(ev) => sendFile(ev)}
          className="hidden"
        />
        <input
          type="file"
          accept="*"
          ref={fileInputRef}
          onChange={(ev) => sendFile(ev)}
          className="hidden"
        />
      </div>

      <div className="mt-2 flex-1">
        <Spin spinning={isLoading} tip="发送中...">
          <textarea
            onChange={(ev) => changeInputValue(ev)}
            value={inputValue}
            onKeyDown={(ev) => {
              if (ev.key === "Enter" && !ev.shiftKey) {
                ev.preventDefault();
                sendText();
              }
            }}
            placeholder="输入消息，Enter 发送，Shift+Enter 换行"
            className="border-surface-200 bg-surface-50 text-surface-800 placeholder:text-surface-400 focus:border-primary-300 focus:ring-primary-100 h-full w-full resize-none rounded-xl border p-3 text-sm transition-colors outline-none focus:bg-white focus:ring-2"
          />
        </Spin>
      </div>

      <div className="flex items-center justify-end pt-2">
        <Button type="primary" onClick={sendText} className="rounded-lg shadow-sm">
          发送
        </Button>
      </div>

      {mountAudioModal && callReceiverList.length > 0 && (
        <AudioModal
          mountModal={mountAudioModal}
          setMountModal={setMountAudioModal}
          type={friendOrGroup(curChat) ? "friend" : "group"}
          roomKey={curChat.roomKey}
          callReceiverList={callReceiverList}
          state="initial"
        />
      )}
      {mountVideoModal && callReceiverList.length > 0 && (
        <VideoModal
          mountModal={mountVideoModal}
          setMountModal={setMountVideoModal}
          type={friendOrGroup(curChat) ? "friend" : "group"}
          roomKey={curChat.roomKey}
          callReceiverList={callReceiverList}
          state="initial"
        />
      )}
    </div>
  );
};

export default ChatUtils;
