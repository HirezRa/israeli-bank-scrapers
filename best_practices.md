
<b>Pattern 1: When consuming external/API data in scrapers, treat all intermediate fields as optional and guard every access; never perform arithmetic or property reads that can turn `undefined` into runtime errors or `NaN`, and prefer explicit nullish checks / numeric validation before computing derived values.
</b>

Example code before:
```
const frame = _.find(resp.result.bankIssuedCards.cardLevelFrames, { id });
return { balance: -frame.nextTotalDebit };
```

Example code after:
```
const frame = _.find(resp.result?.bankIssuedCards?.cardLevelFrames, { id });
const nextDebit = frame?.nextTotalDebit;
return { balance: typeof nextDebit === 'number' ? -nextDebit : undefined };
```

<details><summary>Examples for relevant past discussions:</summary>

- https://github.com/eshaham/israeli-bank-scrapers/pull/1041#discussion_r2675262858
- https://github.com/eshaham/israeli-bank-scrapers/pull/1020#discussion_r2644054476
</details>


___

<b>Pattern 2: Prefer precise TypeScript typing for API responses and helpers (including generics) that reflects only the fields actually used; avoid broad index signatures/`Record<string, unknown>` unless the code truly relies on dynamic keys.
</b>

Example code before:
```
interface ApiResponse {
  result: Record<string, any>;
}
const res = await fetchPost(url, body);
const x = res.result.foo.bar; // unsafe
```

Example code after:
```
interface FramesResponse {
  result?: { bankIssuedCards?: { cardLevelFrames?: { cardUniqueId: string; nextTotalDebit?: number }[] } };
}
const res = await fetchPost<FramesResponse>(url, body);
const frame = res.result?.bankIssuedCards?.cardLevelFrames?.[0];
```

<details><summary>Examples for relevant past discussions:</summary>

- https://github.com/eshaham/israeli-bank-scrapers/pull/1041#discussion_r2675262858
- https://github.com/eshaham/israeli-bank-scrapers/pull/1015#discussion_r2584910231
- https://github.com/eshaham/israeli-bank-scrapers/pull/1015#discussion_r2585939926
</details>


___

<b>Pattern 3: Centralize repeated HTTP request headers and other constants (e.g., User-Agent/Origin/Referer) into a single shared object and spread it into requests; keep those values aligned with the current production site domain to reduce scraper drift.
</b>

Example code before:
```
await fetchPost(url, body, {
  'Content-Type': 'application/json',
  'User-Agent': UA,
  Origin: 'https://old.example.com',
  Referer: 'https://old.example.com/',
  'Accept-Language': 'he-IL,...',
});
await fetchPost(url2, body2, {
  'Content-Type': 'application/json',
  'User-Agent': UA,
  Origin: 'https://old.example.com',
  Referer: 'https://old.example.com/',
  'Accept-Language': 'he-IL,...',
});
```

Example code after:
```
const apiHeaders = {
  'Content-Type': 'application/json',
  'User-Agent': UA,
  Origin: 'https://new.example.com',
  Referer: 'https://new.example.com/',
  'Accept-Language': 'he-IL,...',
} as const;

await fetchPost(url, body, { Authorization, ...apiHeaders });
await fetchPost(url2, body2, { Authorization, ...apiHeaders });
```

<details><summary>Examples for relevant past discussions:</summary>

- https://github.com/eshaham/israeli-bank-scrapers/pull/992#discussion_r2586006258
- https://github.com/eshaham/israeli-bank-scrapers/pull/992#discussion_r2586017689
- https://github.com/eshaham/israeli-bank-scrapers/pull/1020#discussion_r2644128399
</details>


___

<b>Pattern 4: When changing behavior or adding features in scrapers, avoid breaking changes by filtering early and keeping control flow simple (e.g., `.filter`/early-continue), and gate optional heavy behavior behind explicit options/opt-in flags with accompanying documentation.
</b>

Example code before:
```
for (const acc of accounts) {
  const isActive = acc.closingReason === 0;
  if (isActive) {
    results.push(await scrape(acc));
  } else {
    results.push({ accountNumber: acc.num, txns: [] }); // ambiguous behavior change
  }
}
```

Example code after:
```
const activeAccounts = accounts.filter(a => a.closingReason === 0);
const results = await Promise.all(activeAccounts.map(a => scrape(a)));

// Optional extra work behind a flag
if (options.additionalTransactionInformation) {
  await enrichTransactions(results);
}
```

<details><summary>Examples for relevant past discussions:</summary>

- https://github.com/eshaham/israeli-bank-scrapers/pull/1022#discussion_r2644073416
- https://github.com/eshaham/israeli-bank-scrapers/pull/991#discussion_r2484768839
- https://github.com/eshaham/israeli-bank-scrapers/pull/1013#discussion_r2582471242
</details>


___
