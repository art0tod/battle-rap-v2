const tournamentStatusLabels: Record<string, string> = {
  draft: "Черновик",
  registration: "Регистрация",
  ongoing: "Идет",
  completed: "Завершен",
  archived: "Архив",
};

const roundStatusLabels: Record<string, string> = {
  draft: "Подготовка",
  submission: "Прием работ",
  judging: "Судейство",
  finished: "Итоги",
};

const matchStatusLabels: Record<string, string> = {
  scheduled: "Запланирован",
  submission: "Прием треков",
  judging: "Судейство",
  finished: "Завершен",
  tie: "Ничья",
  cancelled: "Отменен",
};

const challengeStatusLabels: Record<string, string> = {
  initiated: "Новый",
  in_progress: "В процессе",
  completed: "Завершен",
  cancelled: "Отменен",
};

export const formatTournamentStatus = (value: string) =>
  tournamentStatusLabels[value] ?? value;

export const formatRoundStatus = (value: string) =>
  roundStatusLabels[value] ?? value;

export const formatMatchStatus = (value: string) =>
  matchStatusLabels[value] ?? value;

export const formatChallengeStatus = (value: string) =>
  challengeStatusLabels[value] ?? value;
