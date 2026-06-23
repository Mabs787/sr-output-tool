import { addons, types } from "storybook/manager-api";
import { AddonPanel } from "storybook/internal/components";
import { ADDON_ID, PANEL_ID, PANEL_TITLE } from "./constants";
import { SRPanel } from "./Panel";

addons.register(ADDON_ID, () => {
  addons.add(PANEL_ID, {
    type: types.PANEL,
    title: PANEL_TITLE,
    // Only show the panel in story canvas mode, not docs.
    match: ({ viewMode }: { viewMode?: string }) => viewMode === "story",
    render: ({ active }: { active?: boolean }) => (
      <AddonPanel active={active ?? false}>
        <SRPanel active={active ?? false} />
      </AddonPanel>
    ),
  });
});
