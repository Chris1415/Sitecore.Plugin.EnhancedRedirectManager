import Image from "next/image";

export function HahnSoloFooter() {
  return (
    <div className="fixed bottom-0 right-0 z-50 p-2 pointer-events-none">
      <Image
        src="/hahn-solo-logo.png"
        alt="Logo Christian Hahn"
        width={40}
        height={20}
        style={{ width: "auto", height: "auto" }}
      />
    </div>
  );
}
