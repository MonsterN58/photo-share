import { redirect } from "next/navigation";
import { UploadForm } from "@/components/upload/upload-form";
import { Upload } from "lucide-react";
import { getCurrentUser } from "@/lib/auth-adapter";

export default async function UploadPage() {
  const user = await getCurrentUser();
  if (!user) redirect("/login");

  return (
    <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8 py-6 sm:py-10">
      <div className="max-w-2xl mx-auto">
        <div className="flex items-center gap-3 mb-8">
          <div className="w-10 h-10 rounded-full bg-gray-100 flex items-center justify-center">
            <Upload className="h-5 w-5 text-gray-600" />
          </div>
          <div>
            <h1 className="text-xl font-bold text-gray-900">上传照片</h1>
            <p className="text-sm text-gray-500">分享你的摄影作品</p>
          </div>
        </div>
        <UploadForm />
      </div>
    </div>
  );
}
