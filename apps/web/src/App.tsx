import { Navigate, Route, Routes } from "react-router-dom";
import CenteredMessage from "@/components/CenteredMessage";
import Layout from "@/components/Layout";
import { useMe } from "@/lib/api";
import AccessPage from "@/pages/access/AccessPage";
import IssuePage from "@/pages/issue/IssuePage";
import IssuesPage from "@/pages/issues/IssuesPage";
import LoginPage from "@/pages/login/LoginPage";
import NewIssuePage from "@/pages/newIssue/NewIssuePage";
import NoAccessPage from "@/pages/noAccess/NoAccessPage";
import SprintsPage from "@/pages/sprints/SprintsPage";

export default function App() {
  const me = useMe();
  if (me.isPending) return <CenteredMessage text="Загрузка…" />;
  if (me.error) return <CenteredMessage text={me.error.message} />;
  if (!me.data) return <LoginPage />;
  if (me.data.access !== "active") return <NoAccessPage me={me.data} />;

  return (
    <Routes>
      <Route element={<Layout me={me.data} />}>
        <Route index={true} element={<Navigate to="/issues?status=open" replace={true} />} />
        <Route path="/issues" element={<IssuesPage />} />
        <Route path="/issues/new" element={<NewIssuePage />} />
        <Route path="/issues/:key" element={<IssuePage />} />
        <Route path="/sprints" element={<SprintsPage />} />
        {!!me.data.isAdmin && <Route path="/admin/access" element={<AccessPage me={me.data} />} />}
        <Route path="*" element={<Navigate to="/issues?status=open" replace={true} />} />
      </Route>
    </Routes>
  );
}
