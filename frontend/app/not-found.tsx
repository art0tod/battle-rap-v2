import Link from "next/link";

export default function NotFoundPage() {
  return (
    <div>
      <h2>Страница не найдена</h2>
      <p>Запрошенный ресурс отсутствует или больше не доступен.</p>
      <Link href="/">На главную</Link>
    </div>
  );
}
