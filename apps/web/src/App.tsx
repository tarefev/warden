import { Navigate, Route, Routes } from "react-router-dom";
import CenteredMessage from "@/components/CenteredMessage";
import Layout from "@/components/Layout";
import { useMe } from "@/lib/api";
import AccessPage from "@/pages/access/AccessPage";
import HomePage from "@/pages/home/HomePage";
import LoginPage from "@/pages/login/LoginPage";
import NoAccessPage from "@/pages/noAccess/NoAccessPage";

export default function App() {
  const me = useMe();
  if (me.isPending) return <CenteredMessage text="Загрузка…" />;
  if (me.error) return <CenteredMessage text={me.error.message} />;
  if (!me.data) return <LoginPage />;
  if (me.data.access !== "active") return <NoAccessPage me={me.data} />;

  return (
    <Routes>
      <Route element={<Layout me={me.data} />}>
        <Route index={true} element={<HomePage />} />
        {!!me.data.isAdmin && <Route path="/admin/access" element={<AccessPage me={me.data} />} />}
        <Route path="*" element={<Navigate to="/" replace={true} />} />
      </Route>
    </Routes>
  );
}
