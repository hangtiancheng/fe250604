import { Plus, Search } from "@icon-park/react";
import { Input, Tooltip } from "antd";
import { useState } from "react";
import AddModal from "../add-modal";
import CreateGroupModal from "../create-group-modal";

const SearchBar: React.FC = () => {
  const [mountAddModal, setMountAddModal] = useState(false);
  const [mountCreateGroupModal, setMountCreateGroupModal] = useState(false);

  const AddOrCreateGroup = (
    <ul className="cursor-pointer text-sm">
      <li className="hover:bg-surface-100 rounded px-2 py-1" onClick={() => setMountAddModal(true)}>
        加好友/群聊
      </li>
      <li
        className="hover:bg-surface-100 rounded px-2 py-1"
        onClick={() => setMountCreateGroupModal(true)}
      >
        创建群聊
      </li>
    </ul>
  );

  return (
    <div>
      <div className="flex items-center gap-2">
        <Input
          placeholder="搜索"
          prefix={<Search theme="outline" size="16" fill="#94a3b8" />}
          className="rounded-lg"
        />
        <Tooltip placement="bottomLeft" title={AddOrCreateGroup} arrow={false}>
          <div className="text-surface-500 hover:bg-surface-100 hover:text-surface-700 flex h-8 w-8 shrink-0 cursor-pointer items-center justify-center rounded-lg transition-colors">
            <Plus theme="outline" size="18" />
          </div>
        </Tooltip>
      </div>
      {mountAddModal && <AddModal mountModal={mountAddModal} setMountModal={setMountAddModal} />}
      {mountCreateGroupModal && (
        <CreateGroupModal
          mountModal={mountCreateGroupModal}
          setMountModal={setMountCreateGroupModal}
          type="createGroup"
        />
      )}
    </div>
  );
};

export default SearchBar;
