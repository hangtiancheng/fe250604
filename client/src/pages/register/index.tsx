import { registerApi } from "@/apis/user";
import useToast from "@/hooks/use-toast";
import useViewStore from "@/store/view";
import { ILoginParams } from "@/types/user";
import { BaseState } from "@/utils/constants";
import { useState } from "react";
import { Button, Form, Input } from "antd";
import { genBase64 } from "@/utils/img";

export default function Register() {
  type RegisterForm = ILoginParams & { confirmPwd: string };
  const viewStore = useViewStore();
  const toast = useToast();
  const [registerFormInst] = Form.useForm<RegisterForm>();

  const [isLoading, setIsLoading] = useState(false);

  const handleRegister = async (form: RegisterForm) => {
    const { email, password, confirmPwd } = form;
    if (password !== confirmPwd) {
      return toast.error("两次输入的密码不同");
    }
    setIsLoading(true);
    try {
      const reqData = {
        email,
        password,
        avatar: genBase64(email),
      };
      const res = await registerApi(reqData);
      if (res.code === BaseState.Ok) {
        toast.success("注册成功");
        viewStore.setView("login");
      } else {
        toast.error(res.msg);
      }
    } catch (err) {
      console.error(err);
      toast.error("注册失败");
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="from-surface-900 via-surface-800 to-primary-950 flex h-dvh w-dvw items-center justify-center bg-gradient-to-br">
      <div className="absolute inset-0 overflow-hidden">
        <div className="bg-primary-500/10 absolute -top-40 -right-40 h-96 w-96 rounded-full blur-3xl" />
        <div className="bg-primary-400/10 absolute -bottom-40 -left-40 h-96 w-96 rounded-full blur-3xl" />
      </div>

      <div className="shadow-float relative w-full max-w-md rounded-2xl border border-white/10 bg-white/5 p-10 backdrop-blur-xl">
        <div className="mb-8 text-center">
          <h1 className="text-3xl font-semibold tracking-tight text-white">创建账号</h1>
          <p className="text-surface-400 mt-2 text-sm">注册一个新账号，开始聊天</p>
        </div>

        <Form onFinish={handleRegister} form={registerFormInst} size="large">
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
          <Form.Item
            name="confirmPwd"
            rules={[
              { required: true, message: "请确认密码" },
              { max: 15, message: "密码最多 15 个字符" },
            ]}
          >
            <Input
              placeholder="确认密码"
              maxLength={15}
              type="password"
              className="placeholder:text-surface-500 rounded-lg border-white/10 bg-white/5 text-white"
            />
          </Form.Item>
          <Form.Item className="mb-4">
            <Button
              type="primary"
              loading={isLoading}
              htmlType="submit"
              block
              className="shadow-primary-500/25 h-11 rounded-lg text-base font-medium shadow-lg"
            >
              注册
            </Button>
          </Form.Item>
        </Form>

        <div className="text-surface-400 text-center text-sm">
          已有账号？
          <button
            type="button"
            className="text-primary-400 hover:text-primary-300 ml-1 transition-colors"
            onClick={() => viewStore.setView("login")}
          >
            去登录
          </button>
        </div>
      </div>
    </div>
  );
}
