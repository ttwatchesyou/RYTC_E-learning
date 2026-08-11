import { useMemo } from "react";
import { CAD_COMMANDS, COMMAND_CATEGORIES } from "@/features/cad/data/commands";
import {
  CadCommand,
  CadDocumentType,
  CommandCategory,
} from "@/features/cad/types";
import styles from "./CadWorkspace.module.css";

interface CommandBarProps {
  activeCategory: CommandCategory;
  activeCommandId?: string;
  documentType: CadDocumentType;
  onCategoryChange: (category: CommandCategory) => void;
  onCommandSelect: (command: CadCommand) => void;
}

export default function CommandBar({
  activeCategory,
  activeCommandId,
  documentType,
  onCategoryChange,
  onCommandSelect,
}: CommandBarProps) {
  const availableCategoryIds: CommandCategory[] =
    documentType === "part"
      ? ["sketch", "features", "view"]
      : documentType === "assembly"
        ? ["assembly", "view"]
        : ["drawing", "view"];
  const groupedCommands = useMemo(() => {
    const categoryCommands = CAD_COMMANDS.filter(
      (command) => command.category === activeCategory,
    );

    return categoryCommands.reduce<Array<{ name: string; commands: CadCommand[] }>>(
      (groups, command) => {
        const existing = groups.find((group) => group.name === command.group);
        if (existing) existing.commands.push(command);
        else groups.push({ name: command.group, commands: [command] });
        return groups;
      },
      [],
    );
  }, [activeCategory]);

  return (
    <section className={styles.commandBar} aria-label="CAD command bar">
      <div className={styles.commandTabs} role="tablist">
        {COMMAND_CATEGORIES.filter((category) =>
          availableCategoryIds.includes(category.id),
        ).map((category) => (
          <button
            aria-selected={activeCategory === category.id}
            className={activeCategory === category.id ? styles.commandTabActive : ""}
            key={category.id}
            onClick={() => onCategoryChange(category.id)}
            role="tab"
          >
            {category.label}
          </button>
        ))}
      </div>
      <div className={styles.commandGroups}>
        {groupedCommands.map((commandGroup) => (
          <div className={styles.commandGroup} key={commandGroup.name}>
            <div className={styles.commandTools}>
              {commandGroup.commands.map((command) => (
                <button
                  aria-pressed={activeCommandId === command.id}
                  className={`${styles.commandTool} ${
                    activeCommandId === command.id ? styles.commandToolActive : ""
                  }`}
                  key={command.id}
                  onClick={() => onCommandSelect(command)}
                  title={command.description}
                >
                  <span>{command.glyph}</span>
                  <small>{command.label}</small>
                </button>
              ))}
            </div>
            <span className={styles.commandGroupLabel}>{commandGroup.name}</span>
          </div>
        ))}
      </div>
    </section>
  );
}
