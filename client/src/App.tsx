import zhCN from 'antd/es/locale/zh_CN';
import { App as AntdApp, ConfigProvider } from 'antd';
import useViewStore from './store/view';
import useTokenStore from './store/token';
import Login from './pages/login';
import Register from './pages/register';
import Home from './pages/home';

export default function App() {
  const view = useViewStore((state) => state.view);
  const token = useTokenStore((state) => state.token);

  let page: React.ReactNode;
  switch (view) {
    case 'register':
      page = <Register />;
      break;
    case 'home':
      page = token ? <Home /> : <Login />;
      break;
    default:
      page = <Login />;
  }

  return (
    <ConfigProvider
      theme={{
        token: {
          colorPrimary: '#8bc34a',
          borderRadius: 16,
        },
        components: {
          Tree: { indentSize: 0 },
        },
      }}
      locale={zhCN}
    >
      <AntdApp>{page}</AntdApp>
    </ConfigProvider>
  );
}
