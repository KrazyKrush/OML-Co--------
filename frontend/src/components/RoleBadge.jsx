import React from 'react';

export default function RoleBadge({ role }) {
  const getRoleInfo = () => {
    switch(role) {
      case 'admin':
        return { text: 'Администратор', color: '#feb2b2', bg: 'rgba(254, 178, 178, 0.1)' };
      case 'seller':
        return { text: 'Продавец', color: '#9ae6b4', bg: 'rgba(154, 230, 180, 0.1)' };
      case 'user':
        return { text: 'Пользователь', color: '#b794f4', bg: 'rgba(183, 148, 244, 0.1)' };
      default:
        return { text: 'Гость', color: '#b5adff', bg: 'rgba(181, 173, 255, 0.1)' };
    }
  };

  const info = getRoleInfo();

  return (
    <span 
      className="role-badge"
      style={{
        backgroundColor: info.bg,
        color: info.color,
        padding: '4px 12px',
        borderRadius: '20px',
        fontSize: '12px',
        fontWeight: 'bold',
        display: 'inline-block'
      }}
    >
      {info.text}
    </span>
  );
}