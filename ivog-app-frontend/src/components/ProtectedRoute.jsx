import React from 'react';
import { Navigate, Outlet } from 'react-router-dom';

const ProtectedRoute = () => {
    const token = localStorage.getItem('authToken');
    const isTelegram = !!window.Telegram?.WebApp?.initData;

    // Se estiver no Telegram OU tiver um token web, permite o acesso.
    // (A proteção real da API no backend previne acesso indevido)
    if (isTelegram || token) {
        return <Outlet />;
    }

    // Se não estiver no Telegram e não tiver token, redireciona para o login.
    return <Navigate to="/login" replace />;
};

export default ProtectedRoute;