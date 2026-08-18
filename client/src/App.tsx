import zhCN from "antd/es/locale/zh_CN";
import { App as AntdApp, ConfigProvider } from "antd";
import useViewStore from "./store/view";
import useTokenStore from "./store/token";
import Login from "./pages/login";
import Register from "./pages/register";
import Home from "./pages/home";

export default function App() {
  const view = useViewStore((state) => state.view);
  const token = useTokenStore((state) => state.token);

  let page: React.ReactNode;
  switch (view) {
    case "register":
      page = <Register />;
      break;
    case "home":
      page = token ? <Home /> : <Login />;
      break;
    default:
      page = <Login />;
  }

  return (
    <ConfigProvider
      theme={{
        token: {
          colorPrimary: "#6366f1",
          borderRadius: 10,
          colorBgContainer: "#ffffff",
          colorBorder: "#e2e8f0",
          colorText: "#1e293b",
          colorTextSecondary: "#64748b",
          fontFamily:
            '-apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, "Helvetica Neue", sans-serif',
        },
        components: {
          Tree: { indentSize: 0 },
          Button: { borderRadius: 8 },
          Input: { borderRadius: 8 },
          Modal: { borderRadiusLG: 16 },
        },
      }}
      locale={zhCN}
    >
      <AntdApp>{page}</AntdApp>
    </ConfigProvider>
  );
}
