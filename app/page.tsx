import Image from "next/image";
import { PipelineSwitcher } from "@/components/pipeline-switcher";
import { ViewModeSwitcher } from "@/components/view-mode-switcher";
import { NewDealButton } from "@/components/new-deal-button";

const pipelines: Pipeline[] = [
  { id: "1", name: "Pipeline 1", group: "standard" },
  { id: "2", name: "Pipeline 20000000", group: "standard" },
  { id: "3", name: "Pipeline 3", group: "custom" },
  { id: "4", name: "Pipeline 4", group: "custom" },
];
export default function Home() {
  return (
    <div className="flex flex-col flex-1 items-center justify-center bg-zinc-50 font-sans dark:bg-black">
      <PipelineSwitcher pipelines={pipelines} defaultValue="1" manageHref="/" />
      <ViewModeSwitcher />
      <NewDealButton href="/" /> {/* links to a page */}
    </div>
  );
}
