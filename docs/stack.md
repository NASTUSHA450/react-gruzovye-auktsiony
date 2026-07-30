# Библиотеки проекта

Документ объясняет роль каждой библиотеки и границы её ответственности.

## Карта состояния

В приложении будет несколько разных видов состояния. Их не следует складывать
в одно общее хранилище.

| Вид состояния | Инструмент | Примеры |
| --- | --- | --- |
| URL и навигация | TanStack Router | текущая страница, UUID, фильтры |
| Данные API | TanStack Query | аукционы, detail, ставки |
| Состояние формы | React Hook Form | введённая цена, touched, errors |
| Проверка данных | Zod | search params, форма ставки |
| Точечный UI-state | Zustand | открыт ли mobile drawer |
| Mock backend | MSW | ответы API и изменение mock store |
| Локальный UI-state | `useState` | открыт небольшой popover |

Главное правило: серверные данные не дублируются в Zustand, а URL-фильтры не
дублируются в локальном состоянии без необходимости.

## TanStack Router

Пакеты:

```text
@tanstack/react-router
@tanstack/router-plugin
```

Отвечает за:

- сопоставление URL и страницы;
- переходы по ссылкам;
- path params, например `auctionUuid`;
- search params, например `page`, `status`, `cargo_num`;
- валидацию search params;
- типобезопасные ссылки и параметры;
- preload страницы по intent/hover.

Аналог во Vue — Vue Router.

Сравнение:

```vue
<RouterLink :to="{ name: 'auction', params: { auctionUuid } }" />
```

```tsx
<Link
  to="/auctions/$auctionUuid"
  params={{ auctionUuid }}
/>
```

Выбираем file-based routing. Файлы маршрутов будут содержать конфигурацию в
`.ts`, а React-компоненты страниц — в отдельных `*.component.tsx`. Это позволяет
соблюсти обязательное правило именования компонентов.

Vite-плагин генерирует типизированное дерево маршрутов `routeTree.gen.ts`.
Сгенерированный файл нельзя редактировать вручную.

## TanStack Query

Пакет:

```text
@tanstack/react-query
```

Отвечает за серверное состояние:

- загрузку данных;
- кеширование;
- состояния pending, error и success;
- повторные запросы;
- prefetch;
- mutations;
- invalidation после изменения данных.

Аналог во Vue — `@tanstack/vue-query`. Концепции и query keys практически
одинаковы.

Без TanStack Query пришлось бы вручную хранить:

```ts
const [data, setData] = useState()
const [isLoading, setIsLoading] = useState(false)
const [error, setError] = useState()
```

TanStack Query собирает это в один контролируемый жизненный цикл запроса.

Важно: Query не заменяет API-клиент. Функцию с `fetch` мы пишем отдельно, а
Query решает, когда её вызвать и как кешировать результат.

## React Hook Form

Пакет:

```text
react-hook-form
```

Отвечает за:

- регистрацию полей формы;
- значения полей;
- touched и dirty states;
- клиентские ошибки;
- отправку формы;
- pending/disabled-поведение формы.

Во Vue ближайшие аналоги — VeeValidate или FormKit.

Обычный `v-model` сам по себе ближе к контролируемому React input:

```tsx
<input value={price} onChange={(event) => setPrice(event.target.value)} />
```

React Hook Form позволяет не писать отдельный `useState` и `onChange` для
каждого поля:

```tsx
<input {...register('price')} />
```

Для нашей формы ставки это уменьшает ручной код и даёт единый объект ошибок.

## Zod

Пакет:

```text
zod
```

Zod описывает правила данных и проверяет значения во время выполнения:

- search params из URL;
- цену ставки;
- `min`, `max` и `step`;
- при необходимости ответы моков.

TypeScript исчезает после сборки и не может проверить данные, пришедшие из URL
или API. Zod работает в браузере и действительно валидирует значение.

Zod одинаково используется в React и Vue:

```ts
const schema = z.object({
  page: z.number().int().positive().catch(1),
})
```

## React Hook Form Resolvers

Пакет:

```text
@hookform/resolvers
```

Это адаптер между React Hook Form и Zod:

```ts
useForm({
  resolver: zodResolver(schema),
})
```

React Hook Form передаёт значения в Zod, а resolver преобразует Zod errors в
формат ошибок формы. Без него интеграцию пришлось бы писать вручную.

## MSW

Пакет:

```text
msw
```

MSW расшифровывается как Mock Service Worker.

Он перехватывает HTTP-запросы на сетевом уровне:

```text
React → fetch('/auctions/list') → MSW handler → mock response
```

Компонент и TanStack Query не знают, настоящий это backend или mock. Поэтому
позже MSW можно отключить, не переписывая UI и API-клиент.

MSW будет отвечать за:

- четыре endpoint из OpenAPI;
- пагинацию и фильтрацию;
- состояния `404`, `422`, `503`;
- in-memory mock store;
- реальное изменение цены и ставок после mutation.

Во Vue MSW работал бы точно так же, потому что он не привязан к React.

MSW находится в `devDependencies`: он нужен для разработки и тестов, но не для
production backend.

## Zustand

Пакет:

```text
zustand
```

Zustand — маленькое хранилище клиентского состояния. Ближайший аналог во Vue —
Pinia.

Пример идеи:

```ts
const useFiltersDrawerStore = create((set) => ({
  isOpen: false,
  open: () => set({ isOpen: true }),
  close: () => set({ isOpen: false }),
}))
```

Используем Zustand точечно:

- mobile filters drawer;
- возможно, UI-настройки, которые нужны в далёких компонентах.

Не храним в Zustand:

- аукционы;
- detail;
- ставки;
- загрузку API;
- URL-фильтры;
- значения формы ставки.

Иначе одно и то же состояние начнёт конкурировать с Query, Router или React
Hook Form.

## Почему библиотек много

Каждая библиотека решает отдельную задачу:

```text
Router         → где находится пользователь
Query          → какие данные пришли с сервера
Hook Form      → что введено в форму
Zod            → корректны ли данные
MSW            → что отвечает mock backend
Zustand        → небольшой глобальный UI-state
```

Такое разделение делает источник каждого значения понятным и уменьшает
количество ручного кода.
