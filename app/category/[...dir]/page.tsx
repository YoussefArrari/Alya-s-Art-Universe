import { GalleryCanvasPage } from "../../page";

export default async function CategoryPage({
  params,
}: {
  params: Promise<{ dir?: string[] }>;
}) {
  const { dir = [] } = await params;
  const decoded = dir.map((s) => decodeURIComponent(s));
  const filterDir = decoded.join("/");
  const folderName = decoded.at(-1) ?? "Photos";

  return (
    <GalleryCanvasPage
      filterDir={filterDir}
      worldSize={2600}
      centerTitle={folderName}
      centerSubtitle="Drag to explore"
    />
  );
}

