'use client';

import React, { useState } from 'react';

interface SettingsModalProps {
  isOpen: boolean;
  onClose: () => void;
  systemPrompt: string;
  userRole: string;
  onSystemPromptChange: (value: string) => void;
  onUserRoleChange: (value: string) => void;
}

export const SettingsModal: React.FC<SettingsModalProps> = ({
  isOpen,
  onClose,
  systemPrompt,
  userRole,
  onSystemPromptChange,
  onUserRoleChange
}) => {
  const [tempSystemPrompt, setTempSystemPrompt] = useState(systemPrompt);
  const [tempUserRole, setTempUserRole] = useState(userRole);

  const handleSave = () => {
    onSystemPromptChange(tempSystemPrompt);
    onUserRoleChange(tempUserRole);
    onClose();
  };

  const handleCancel = () => {
    setTempSystemPrompt(systemPrompt);
    setTempUserRole(userRole);
    onClose();
  };

  const resetToDefaults = () => {
    setTempSystemPrompt('你是一個聰明的 AI 參與會議者. 我需要你用繁體中文，並且根據會議的前後文回答問題.');
    setTempUserRole('');
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50">
      <div className="bg-white rounded-lg p-6 w-full max-w-2xl max-h-[90vh] overflow-y-auto">
        <div className="flex justify-between items-center mb-4">
          <h2 className="text-xl font-semibold text-gray-800">AI 角色設定</h2>
          <button
            onClick={handleCancel}
            className="text-gray-500 hover:text-gray-700 text-2xl"
          >
            ×
          </button>
        </div>

        <div className="space-y-4">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              AI 角色 (System Prompt)
            </label>
            <textarea
              value={tempSystemPrompt}
              onChange={(e) => setTempSystemPrompt(e.target.value)}
              placeholder="例如：你是一位資深的專案經理，請用專業、精簡的口吻總結會議重點。"
              className="w-full p-3 border border-gray-300 rounded-lg resize-none focus:outline-none focus:ring-2 focus:ring-blue-500 text-gray-900"
              rows={4}
            />
            <p className="text-sm text-gray-500 mt-1">
              定義 AI 助手的角色和回應風格
            </p>
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              我的角色 (User Role)
            </label>
            <input
              type="text"
              value={tempUserRole}
              onChange={(e) => setTempUserRole(e.target.value)}
              placeholder="例如：我是一位前端工程師"
              className="w-full p-3 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 text-gray-900"
            />
            <p className="text-sm text-gray-500 mt-1">
              讓 AI 了解你的身份，提供更針對性的回應
            </p>
          </div>

          <div className="flex justify-between items-center pt-4">
            <button
              onClick={resetToDefaults}
              className="px-4 py-2 text-gray-600 hover:text-gray-800 underline"
            >
              重置為預設值
            </button>

            <div className="flex gap-2">
              <button
                onClick={handleCancel}
                className="px-4 py-2 bg-gray-200 text-gray-700 rounded-lg hover:bg-gray-300 transition-colors"
              >
                取消
              </button>
              <button
                onClick={handleSave}
                className="px-4 py-2 bg-blue-500 text-white rounded-lg hover:bg-blue-600 transition-colors"
              >
                儲存
              </button>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};