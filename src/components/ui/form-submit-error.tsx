/** 表单提交区错误提示（紧贴提交按钮上方） */
export function FormSubmitError({ message }: { message: string | null }) {
  if (!message) return null;

  return (
    <p
      role="alert"
      className="rounded-lg bg-red-50 px-3 py-2 text-sm text-error"
    >
      {message}
    </p>
  );
}
