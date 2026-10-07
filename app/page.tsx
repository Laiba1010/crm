import * as React from "react";
import {
  PipelineSwitcher,
  type Pipeline,
} from "@/components/pipeline-switcher";
import { ViewModeSwitcher } from "@/components/view-mode-switcher";
import { NewDealButton } from "@/components/new-deal-button";
import { SavedViews, type SavedView } from "@/components/saved-views";
import { DealSearch } from "@/components/deal-search";
import { SortMenu } from "@/components/sort-menu";
import { FiltersDemo } from "@/components/filters-demo";

const pipelines: Pipeline[] = [
  { id: "1", name: "Pipeline 1", group: "standard" },
  { id: "2", name: "Pipeline 20000000", group: "standard" },
  { id: "3", name: "Pipeline 3", group: "custom" },
  { id: "4", name: "Pipeline 4", group: "custom" },
];

const views: SavedView[] = [
  { id: "mine", name: "My Open Deals", kind: "system", count: 24 },
  { id: "open", name: "All Open", kind: "system", count: 86 },
  { id: "won", name: "Won", kind: "system", count: 31 },
  { id: "hot", name: "Hot Deals, Q4", kind: "custom", count: 9 },
  { id: "ent", name: "Enterprise", kind: "custom", count: 12 },
  { id: "soon", name: "Closing Soon", kind: "custom", count: 7 },
  { id: "prospects", name: "Enterprise Prospects", kind: "custom", count: 18 },
  { id: "month", name: "Closing This Month", kind: "custom", count: 1 },
];

export default function Home() {
  return (
    <div className="flex flex-1 flex-col items-center justify-center gap-6 bg-zinc-50 font-sans dark:bg-black">
      {/* Drag the bottom-right corner to narrow it and watch the overflow. */}
      <div className="w-[640px] max-w-full resize-x overflow-hidden border bg-background p-2">
        <SavedViews views={views} defaultValue="mine" />
      </div>
      <DealSearch className="w-64" />
      <FiltersDemo />
      <SortMenu recordCount={86} />
      <PipelineSwitcher pipelines={pipelines} defaultValue="1" manageHref="/" />
      <ViewModeSwitcher />
      <NewDealButton href="/" /> {/* links to a page */}
    </div>
  );
}
