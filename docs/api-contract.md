# Разбор OpenAPI-контракта

Источник правды: [`openapi.auctions.v0.json`](../openapi.auctions.v0.json).

Документ фиксирует решения, принятые после изучения схемы. Он не заменяет
OpenAPI: если текст здесь расходится со схемой, приоритет имеет схема.

## 1. Операции

| Operation ID | Метод и путь | Request | Успешный response |
| --- | --- | --- | --- |
| `listAuctions` | `POST /auctions/list` | `AuctionListRequest` | `AuctionListResponseBase` |
| `getAuction` | `GET /auctions/{auctionUuid}` | UUID в path | `AuctionShowResponse` |
| `listBets` | `GET /auctions/{auctionUuid}/bets` | UUID и необязательный query `all` | `BetListResponse` |
| `setBet` | `POST /auctions/{auctionUuid}/bets` | `SetBetRequest` | Тело ответа не описано |

Общие ошибки:

- `401` — `ProblemDetail`;
- `404` — `ProblemDetail`;
- `422` — `ValidationProblem`;
- `503` — `ProblemDetail`.

`422` используется для списка и установки ставки. В `ValidationProblem`
присутствует массив `errors` с элементами `{ field, message }`.

## 2. Маршруты SPA

Предварительная схема маршрутов TanStack Router:

| URL | Экран |
| --- | --- |
| `/auctions` | Список аукционов |
| `/auctions/$auctionUuid` | Детальная страница |
| `/auctions/$auctionUuid/bets` | История ставок |
| `/auctions/$auctionUuid/bet` | Форма создания или изменения ставки |

Форма ставки вынесена в отдельный URL, потому что по условию режим установки
ставки должен открываться по ссылке. Такой URL также можно открыть напрямую и
восстановить после обновления страницы.

Аналогия с Vue Router: `$auctionUuid` в файловой конфигурации TanStack Router
играет роль динамического параметра `:auctionUuid`.

## 3. Query keys

Все ключи создаются централизованной фабрикой:

```ts
auctionKeys.all
auctionKeys.lists()
auctionKeys.list(request)
auctionKeys.details()
auctionKeys.detail(auctionUuid)
auctionKeys.bets(auctionUuid, { all })
```

Предполагаемая форма ключей:

```ts
['auctions']
['auctions', 'list', request]
['auctions', 'detail', auctionUuid]
['auctions', 'bets', auctionUuid, { all }]
```

После успешной ставки инвалидируются:

- все списки аукционов;
- detail текущего аукциона;
- bets текущего аукциона.

Это аналог ключей кеша в Vue Query: TanStack Query имеет почти одинаковый API
для Vue и React.

## 4. DTO и ViewModel

Будут разделены два вида моделей.

### API DTO

Максимально точно повторяют OpenAPI:

- имена полей в `snake_case`;
- `undefined` для необязательного поля;
- `null` только для поля с `nullable: true`;
- строковые enum представлены union-типами;
- UUID и даты на границе API остаются строками.

### ViewModel

Подготавливаются mapper-функциями для UI:

- содержат только данные, необходимые экрану;
- могут использовать понятные вычисленные поля;
- содержат готовый вариант primary action;
- не заставляют компонент разбираться в разнице между `null`, пустой строкой и
  отсутствующим полем;
- не изменяют исходные DTO.

Во Vue это соответствовало бы связке:

```text
API DTO → mapper/composable → данные для template
```

В React будет:

```text
API DTO → mapper → props React-компонента
```

## 5. Optional и nullable

OpenAPI различает два независимых состояния:

- поле отсутствует — оно не входит в `required`, в TypeScript это `?`;
- поле присутствует со значением `null` — в схеме указано `nullable: true`.

Например, если поле необязательное и nullable:

```ts
lastBet?: number | null
```

Большинство вложенных DTO не имеют массива `required`. Поэтому делать все их
поля обязательными нельзя, даже если в `example` указано значение.

Некоторые поля имеют `example: null`, но не имеют `nullable: true`. Это
противоречие схемы. В моках будут отдельные сценарии с фактическим `null`, а
mapper должен безопасно обработать такое значение. Сам API-тип при этом должен
сохранять официальный контракт.

## 6. Enum

### Тип аукциона

```text
Request | Up | Down | FixPrice | Unknown
```

### Статус аукциона

```text
Planning | Auction | DeterminateWinner | WaitDeal | InProgress
Finished | Stopped | Canceled | Unknown
```

### Торговый статус пользователя

```text
NotParticipating | Leading | Losing | OnPending | Confirmed
ChoosingWinner | Winner | Accepted | Unknown
```

Список использует сокращённый набор торговых статусов в `status_mobile`, а
фильтр `status` использует полный `TradingStatus`. UI не должен считать эти
поля одним и тем же enum без явного преобразования.

### Единица ставки

```text
PerRoute | PerKm | Unknown
```

### Тип точки маршрута

```text
Loading | Unloading | Unknown
```

### Тип отсрочки оплаты

```text
CalendarDays | WorkDays | Unknown
```

В UI для каждого enum будет словарь человекочитаемых русских подписей.
`Unknown` обязательно имеет безопасную подпись, а не вызывает ошибку.

## 7. Список аукционов

`POST /auctions/list` принимает необязательное body. Для приложения мы всегда
будем собирать явный request с безопасными значениями пагинации.

Минимальные фильтры задания сопоставляются так:

| UI-фильтр | Поле API |
| --- | --- |
| Номер груза | `cargo_num` |
| Торговый статус | `status` |
| Статусы аукциона | `statuses` |
| Тип аукциона | `auc_type` — массив |
| Город погрузки | `load_city` |
| Город выгрузки | `unload_city` |
| Дата погрузки от/до | `load_date_from`, `load_date_to` |
| Доступен | `is_available` |
| Я участник | `is_bidder` |
| Цена от/до | `current_price_from`, `current_price_to` |

Пагинация:

```text
request:  page, per_page
response: current_page, from, last_page, per_page, to, total
```

В API есть дополнительные фильтры. Они не входят в первую версию UI, но request
builder не должен мешать добавить их позднее.

## 8. Детальная страница

Корневые поля `AuctionShowResponse`, помеченные обязательными:

- `main`;
- `organizer`;
- `contacts`;
- `cargo`;
- `trading`;
- `payment`;
- `assembly`;
- `routes`;
- `admitted_organizations`.

`hide_bets_history` присутствует и в корне response, и в `trading`. До появления
реального backend приоритетным считаем `trading.hide_bets_history`, потому что
это ограничение торгов. Mapper должен централизовать это решение.

Ограничения detail DTO:

- `trading.can_set_bet`;
- `trading.hide_bets_history`;
- `trading.hide_places`;
- `trading.no_view_cargo_price`;
- `trading.hide_points_address_and_contacts`.

Если адреса и контакты скрыты, UI не должен просто рисовать пустые поля — он
должен показать понятное состояние «данные скрыты организатором».

## 9. Ставка

Request:

```json
{
  "price": 15000
}
```

`price` обязательна и должна быть больше нуля. OpenAPI описывает это только в
тексте поля, без JSON Schema-ограничения `exclusiveMinimum`, поэтому правило
явно дублируется в Zod.

Дополнительные ограничения берутся из detail:

- `trading.price.min`;
- `trading.price.max`;
- `trading.price.step`;
- `trading.price.available`.

Все четыре поля nullable. Zod-схема формы должна строиться с учётом реально
полученных значений.

У `POST /bets` не описано тело успешного ответа. Клиент не должен пытаться
прочитать JSON после `200`; источником актуальных данных после mutation станут
инвалидация запросов и повторная загрузка list/detail/bets.

## 10. История ставок

`GET /bets` принимает необязательный query-параметр `all`, который включает
отменённые ставки.

У `BetListResponse` обязательным является только массив `bets`. Количество
участников отдельным полем не приходит. Его придётся вычислять по уникальным
перевозчикам, предположительно по `organization_id`. Это решение будет покрыто
тестом mapper.

Отменённая ставка определяется не одним полем:

- `is_rejected`;
- `cancel_reason`.

Победитель определяется через `is_win`, место — через nullable-поле `place`.

## 11. Сценарии MSW

Моки должны покрывать не только happy path:

- несколько типов и статусов аукционов;
- пользователь не участвует, лидирует, проигрывает и победил;
- доступная и запрещённая ставка;
- nullable `min`, `max`, `step`, `available`;
- пустой список аукционов;
- пустая история ставок;
- скрытая история ставок;
- скрытые адреса, контакты и цена груза;
- аукцион не найден (`404`);
- ошибка списка (`422` и `503`);
- невалидная ставка (`422`);
- mutation реально меняет цену, статус пользователя и историю ставок.

## 12. Риски контракта

1. У многих DTO нет `required`, хотя примеры выглядят как полностью заполненные
   ответы.
2. Некоторые `example: null` не сопровождаются `nullable: true`.
3. Успешный response установки ставки не имеет схемы тела.
4. `hide_bets_history` продублирован на двух уровнях detail response.
5. Числовые значения груза в точках маршрута приходят строками.
6. Цена груза в detail приходит строкой, торговые цены — числами.
7. Количество участников не приходит отдельным полем.
8. В списке и detail используются разные наборы торговых статусов.

Эти места должны быть явно отражены в моках, mapper-функциях и тестах.
