import Link from "next/link";
import { fetchActiveApplicationRound } from "@/lib/data";
// import { ApplicationForm } from "@/components/application-form";

export const dynamic = "force-dynamic";

export default async function NewApplicationPage() {
  const round = await fetchActiveApplicationRound();

  if (!round) {
    return (
      <div>
        <h2>Подача заявок</h2>
        <p>
          На данный момент прием заявок закрыт. Следите за обновлениями турнира.
        </p>
        <Link href="/tournaments">Посмотреть турниры</Link>
      </div>
    );
  }

  return (
    <div>
      <h2>Подача заявки в турнир</h2>
      <p>
        Раунд {round.number} ({round.kind}) турнира {round.tournament_title}{" "}
        открыт для заявок. Заполните данные и загрузите трек, чтобы попасть в
        отборочный этап.
      </p>
      {/* <ApplicationForm round={round} /> */}
    </div>
  );
}
