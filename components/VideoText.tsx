import { VideoText } from "@/components/magicui/video-text";

export function VideoTextDemo() {
  return (
<div className="absolute h-[300px] w-[600px] mx-auto overflow-hidden flex items-center justify-center">
      <VideoText src="/particle.mp4">
        CONNECT
      </VideoText>
    </div>
  );
}
