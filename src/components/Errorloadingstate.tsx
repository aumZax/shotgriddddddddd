import { WifiOff } from 'lucide-react';

interface ErrorLoadingStateProps {
    message?: string;
    entityName?: string; // e.g. "sequences", "assets", "shots"
}

export default function ErrorLoadingState({
    message,
    entityName = "data",
}: ErrorLoadingStateProps) {
    return (
        <div className="flex flex-col items-center justify-center h-full min-h-[400px] px-4">
            <div className="text-center space-y-6 max-w-sm">
                {/* Icon */}
                <div className="relative mx-auto w-24 h-24">
                    <div className="absolute inset-0 rounded-full bg-red-500/10 animate-ping" />
                    <div className="relative flex items-center justify-center w-24 h-24 rounded-full bg-gradient-to-br from-gray-800 to-gray-900 border border-red-500/30 shadow-lg shadow-red-500/10">
                        <WifiOff className="w-10 h-10 text-red-400" />
                    </div>
                </div>

                {/* Title */}
                <div className="space-y-2">
                    <h3 className="text-xl font-semibold text-gray-200">
                        โหลด {entityName.charAt(0).toUpperCase() + entityName.slice(1)} ไม่สำเร็จ
                    </h3>
                    <p className="text-sm text-gray-500 leading-relaxed">
                        {message || `ไม่สามารถดึงข้อมูล ${entityName} ได้ กรุณาตรวจสอบการเชื่อมต่อแล้วลองใหม่อีกครั้ง`}
                    </p>
                </div>

            </div>
        </div>
    );
}