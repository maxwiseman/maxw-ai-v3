export function classesToLLMKey(
  items: { name: string; shortName?: string; id: number }[],
) {
  const key = items
    .map((item) => {
      const itemName = item.name;
      const conflicts = items.filter(
        (subItem) => subItem.name === itemName && subItem.id !== item.id,
      );
      let conflictSuffix = "";
      if (conflicts.length !== 0) {
        conflictSuffix = `-${conflicts.findIndex(
          (subCourse) => item.id === subCourse.id,
        )}`;
      }

      return `- ${item.name}, ${item.shortName ?? item.name}, \`${(
        item.shortName ?? item.name
      )
        .trim()
        .toLowerCase()
        .replaceAll(" ", "-")}${conflictSuffix}\``;
    })
    .join("\n");
  return key;
}

export function LLMKeyToCanvasId(
  LLMKey: string,
  items: { name: string; shortName?: string; id: number }[],
) {
  const key = Object.fromEntries(
    items.map((item) => {
      const itemName = item.name;
      const conflicts = items.filter(
        (subItem) => subItem.name === itemName && subItem.id !== item.id,
      );
      let conflictSuffix = "";
      if (conflicts.length !== 0) {
        conflictSuffix = `-${conflicts.findIndex(
          (subItem) => item.id === subItem.id,
        )}`;
      }

      // return `- ${course.original_name}: \`${course.name
      //   .toLowerCase()
      //   .replaceAll(" ", "-")}${conflictSuffix}\``;
      return [
        `${(item.shortName ?? item.name)
          .trim()
          .toLowerCase()
          .replaceAll(" ", "-")}${conflictSuffix}`,
        item.id,
      ];
    }),
  );
  return key[LLMKey.trim().toLowerCase().replaceAll(" ", "-")];
}
