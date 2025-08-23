// --- Toggle une section ouverte/fermée
const toggleGroup = (key: string) => {
  setOpenGroups((prev) => ({
    ...prev,
    [key]: !prev[key],
  }));
};

// --- Groups (Jeux toujours ouverts, les sagas fermées au départ)
const groups = useMemo(() => {
  if (!groupBySaga) return [["Tous les jeux", filteredGames] as const];

  const map = new Map<string, GameDTO[]>();
  for (const g of filteredGames) {
    const key = g.saga?.trim() || "Jeux";
    if (!map.has(key)) map.set(key, []);
    map.get(key)!.push(g);
  }

  const result = Array.from(map.entries()).sort(([a], [b]) => {
    if (a === "Jeux") return -1; // "Jeux" toujours en premier
    if (b === "Jeux") return 1;
    return a.localeCompare(b);
  });

  // 👉 initialise l'état openGroups selon le nom
  const initialOpen: Record<string, boolean> = {};
  for (const [saga] of result) {
    initialOpen[saga] = saga === "Jeux"; // "Jeux" ouvert, le reste fermé
  }
  setOpenGroups((prev) => ({ ...initialOpen, ...prev }));

  return result;
}, [filteredGames, groupBySaga]);
