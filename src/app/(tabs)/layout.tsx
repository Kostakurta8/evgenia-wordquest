import BottomNav from "@/components/BottomNav";
import InstallNudge from "@/components/InstallNudge";

export default function TabsLayout({ children }: { children: React.ReactNode }) {
  return (
    <>
      <div className="flex-1 pb-20">{children}</div>
      <InstallNudge />
      <BottomNav />
    </>
  );
}
