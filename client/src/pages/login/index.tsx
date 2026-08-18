import useToast from "@/hooks/use-toast";
import useTokenStore from "@/store/token";
import useUserInfoStore from "@/store/user-info";
import useViewStore from "@/store/view";
import { decrypt, encrypt, genRandStr } from "@/utils/auth";
import { Button, Checkbox, Form, Input } from "antd";
import { useEffect, useState } from "react";
import { loginApi } from "@/apis/user";
import { BaseState } from "@/utils/constants";
import { IUserInfo } from "@/types/user";
import ForgetPwdModal from "@/components/forget-pwd-modal";

const Login: React.FC = () => {
  const tokenStore = useTokenStore();
  const userInfoStore = useUserInfoStore();
  const viewStore = useViewStore();

  const toast = useToast();

  const [isLoading, setIsLoading] = useState(false);
  const [isRemember, setRemember] = useState(false);
  const [loginFormInst] = Form.useForm<{
    email: string;
    password: string;
  }>();
  const [mountPwdModal, setMountPwdModal] = useState(false);

  async function writeLocal(token: string, userInfo: IUserInfo) {
    const encryptedUserInfo = await encrypt(JSON.stringify(userInfo));
    const encryptedToken = await encrypt(token);
    if (encryptedUserInfo && token) {
      localStorage.setItem("userInfo", encryptedUserInfo);
      localStorage.setItem("token", encryptedToken);
    }
  }

  async function readLocal() {
    const userInfoStr = localStorage.getItem("userInfo");
    const token_ = localStorage.getItem("token");
    if (!userInfoStr || !token_) {
      return;
    }
    try {
      const decryptedStr = await decrypt(userInfoStr);
      const userInfo: IUserInfo = JSON.parse(decryptedStr);
      const token = await decrypt(token_);
      return { userInfo, token };
    } catch (err) {
      console.trace(err);
      localStorage.removeItem("token");
      localStorage.removeItem("userInfo");
      return null;
    }
  }

  const handleLogin = async (form: { email: string; password: string }) => {
    const { email, password } = form;
    const ret = await readLocal();
    if (ret && ret.userInfo?.email === email) {
      tokenStore.setToken(ret.token);
      userInfoStore.setUserInfo(ret.userInfo);
      toast.success("登录成功");
      return viewStore.setView("home");
    }
    setIsLoading(true);
    const reqData = { email, password };
    const res = await loginApi(reqData);
    if (res.code === BaseState.Ok && res.data) {
      toast.success("登录成功");
      setIsLoading(false);
      const { token, userInfo } = res.data;
      tokenStore.setToken(token);
      userInfoStore.setUserInfo(userInfo);
      if (isRemember) {
        writeLocal(token, userInfo);
      }
      return viewStore.setView("home");
    }
    toast.error(res.msg || "登录失败");
    setIsLoading(false);
  };

  const handleRemember = () => {
    const newIsRemember = !isRemember;
    setRemember(newIsRemember);
    localStorage.setItem("isRemember", `${newIsRemember}`);
    if (!newIsRemember) {
      localStorage.removeItem("token");
      localStorage.removeItem("userInfo");
    }
  };

  useEffect(() => {
    readLocal().then((val) => {
      if (val) {
        loginFormInst.setFieldsValue({
          email: val.userInfo.email,
          password: genRandStr().slice(0, 15),
        });
        setRemember(true);
      } else {
        setRemember(false);
      }
    });
  }, []);

  return (
    <div className="from-surface-900 via-surface-800 to-primary-950 flex h-dvh w-dvw items-center justify-center bg-gradient-to-br">
      <div className="absolute inset-0 overflow-hidden">
        <div className="bg-primary-500/10 absolute -top-40 -right-40 h-96 w-96 rounded-full blur-3xl" />
        <div className="bg-primary-400/10 absolute -bottom-40 -left-40 h-96 w-96 rounded-full blur-3xl" />
      </div>

      <div className="shadow-float relative w-full max-w-md rounded-2xl border border-white/10 bg-white/5 p-10 backdrop-blur-xl">
        <div className="mb-8 text-center">
          <h1 className="text-3xl font-semibold tracking-tight text-white">欢迎回来</h1>
          <p className="text-surface-400 mt-2 text-sm">登录你的账号，继续聊天</p>
        </div>

        <Form onFinish={handleLogin} form={loginFormInst} size="large">
          <Form.Item
            name="email"
            rules={[
              { required: true, message: "请输入邮箱" },
              { max: 30, message: "邮箱最多 30 个字符" },
            ]}
          >
            <Input
              placeholder="邮箱地址"
              maxLength={30}
              className="placeholder:text-surface-500 rounded-lg border-white/10 bg-white/5 text-white"
            />
          </Form.Item>
          <Form.Item
            name="password"
            rules={[
              { required: true, message: "请输入密码" },
              { max: 15, message: "密码最多 15 个字符" },
            ]}
          >
            <Input
              placeholder="密码"
              maxLength={15}
              type="password"
              className="placeholder:text-surface-500 rounded-lg border-white/10 bg-white/5 text-white"
            />
          </Form.Item>
          <Form.Item className="mb-4">
            <div className="flex items-center justify-between text-sm">
              <Checkbox onChange={handleRemember} checked={isRemember}>
                <span className="text-surface-400">记住密码</span>
              </Checkbox>
              <button
                type="button"
                className="text-primary-400 hover:text-primary-300 transition-colors"
                onClick={() => setMountPwdModal(true)}
              >
                忘记密码
              </button>
            </div>
          </Form.Item>
          <Form.Item className="mb-4">
            <Button
              type="primary"
              loading={isLoading}
              htmlType="submit"
              block
              className="shadow-primary-500/25 h-11 rounded-lg text-base font-medium shadow-lg"
            >
              登录
            </Button>
          </Form.Item>
        </Form>

        <div className="text-surface-400 text-center text-sm">
          还没有账号？
          <button
            type="button"
            className="text-primary-400 hover:text-primary-300 ml-1 transition-colors"
            onClick={() => viewStore.setView("register")}
          >
            立即注册
          </button>
        </div>
      </div>

      {mountPwdModal && (
        <ForgetPwdModal mountModal={mountPwdModal} setMountModal={setMountPwdModal} />
      )}
    </div>
  );
};

export default Login;
