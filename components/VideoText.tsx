import { VideoText } from "@/components/magicui/video-text";

export function VideoTextDemo() {
  return (
    <div className="absolute w-full max-w-[600px] h-[200px] sm:h-[250px] md:h-[300px] mx-auto overflow-hidden flex items-center justify-center px-4">
      <VideoText src="/particle.mp4">
        CONNECT
      </VideoText>
    </div>
  );
}
