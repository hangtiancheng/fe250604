import useUserInfoStore from "@/store/user-info";
import { IMsg } from "@/types/chat";
import { IMediaItem } from "@/types/file";
import {
  calcMediaRawSize,
  calcMediaWidth,
  checkUrlExist,
  downloadFile,
  getFileIcon,
} from "@/utils/file";
import { DeleteFive, Play } from "@icon-park/react";
import { useEffect, useState } from "react";
import { Image, Modal } from "antd";
import { fmtTime4chat } from "@/utils/fmt";
import ImgContainer from "../img-container";

interface IProps {
  isTimeDisplay: boolean;
  msg: IMsg;
}

interface IProps2 {
  mediaType: "text" | "image" | "video" | "file";
  content: string;
  fileSize?: string;
}

const MsgBubble: React.FC<IProps> = (props: IProps) => {
  const { isTimeDisplay, msg } = props;
  const userInfoStore = useUserInfoStore();
  const userInfo = userInfoStore.userInfo;
  const { senderId, content, avatar, mediaType, fileSize, createdAt } = msg;

  const isSelf = senderId === userInfo.id;

  const FallbackContent = () => (
    <div className="bg-surface-100 text-surface-500 flex items-center gap-2 rounded-2xl px-4 py-3 text-sm">
      <DeleteFive theme="filled" size="18" fill="#94a3b8" />
      <span>消息已被删除或清理</span>
    </div>
  );

  const MsgContent = (props2: IProps2) => {
    const { mediaType, content, fileSize } = props2;
    const [curMedia, setCurMedia] = useState<IMediaItem | null>(null);
    const [mediaUrl, setMediaUrl] = useState<string>(
      `${import.meta.env.VITE_SERVER_URL}/${content}`,
    );
    const [isVideoPlay, setIsVideoPlay] = useState<boolean>(false);
    const [isFileExist, setIsFileExist] = useState<boolean>(true);

    useEffect(() => {
      const newMediaUrl = `${import.meta.env.VITE_SERVER_URL}/${content}`;
      setMediaUrl(newMediaUrl);
      if (mediaType !== "text") {
        checkUrlExist(newMediaUrl).then((res) => setIsFileExist(res));
      }
      if (mediaType === "image" || mediaType === "video") {
        calcMediaRawSize(newMediaUrl, mediaType)
          .then((size) => {
            setCurMedia({ type: mediaType, url: newMediaUrl, size });
          })
          .catch(console.error);
      }
    }, [mediaType, content]);

    if (!isFileExist) {
      return <FallbackContent />;
    }
    const filename = mediaUrl.split("/").at(-1)!;
    const FileIcon = getFileIcon(filename);
    switch (mediaType) {
      case "text":
        return (
          <div
            className={`max-w-md rounded-2xl px-4 py-2.5 text-sm leading-relaxed wrap-break-word ${
              isSelf
                ? "bg-primary-500 rounded-br-md text-white"
                : "border-surface-200 text-surface-800 rounded-bl-md border bg-white shadow-sm"
            }`}
          >
            {content}
          </div>
        );
      case "image":
        return (
          curMedia && (
            <div className="overflow-hidden rounded-xl">
              <Image width={calcMediaWidth(curMedia.size, "image")} src={curMedia.url} />
            </div>
          )
        );
      case "video":
        return (
          curMedia && (
            <div className="relative overflow-hidden rounded-xl">
              <video src={mediaUrl} muted className="max-w-xs" />
              <div
                className="absolute inset-0 flex cursor-pointer items-center justify-center bg-black/20 transition-colors hover:bg-black/30"
                onClick={() => setIsVideoPlay(true)}
              >
                <Play theme="filled" size="40" fill="#ffffff" strokeWidth={2} />
              </div>
              <Modal
                open={isVideoPlay}
                footer={null}
                title="视频"
                onCancel={() => setIsVideoPlay(false)}
                destroyOnHidden
                width={800}
              >
                <video src={mediaUrl} muted controls autoPlay width={750} />
              </Modal>
            </div>
          )
        );
      case "file":
        return (
          <div
            onClick={() => downloadFile(mediaUrl)}
            className="border-surface-200 hover:bg-surface-50 flex cursor-pointer items-center gap-3 rounded-xl border bg-white px-4 py-3 shadow-sm transition-colors"
          >
            <FileIcon />
            <div className="min-w-0">
              <div className="text-surface-700 truncate text-sm font-medium">{filename}</div>
              {fileSize && <div className="text-surface-400 text-xs">{fileSize}</div>}
            </div>
          </div>
        );
      default:
        return null;
    }
  };

  return (
    <div className="mb-4">
      {isTimeDisplay && createdAt && (
        <div className="mb-3 flex justify-center">
          <span className="bg-surface-200/60 text-surface-500 rounded-full px-3 py-1 text-xs">
            {fmtTime4chat(createdAt)}
          </span>
        </div>
      )}
      {isSelf ? (
        <div className="flex items-start justify-end gap-3">
          <MsgContent mediaType={mediaType} content={content} fileSize={fileSize} />
          <ImgContainer src={avatar} className="h-9 w-9 shrink-0 rounded-lg object-cover" />
        </div>
      ) : (
        <div className="flex items-start gap-3">
          <ImgContainer src={avatar} className="h-9 w-9 shrink-0 rounded-lg object-cover" />
          <MsgContent mediaType={mediaType} content={content} fileSize={fileSize} />
        </div>
      )}
    </div>
  );
};

export default MsgBubble;
