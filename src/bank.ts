import * as cheerio from "cheerio";
import axios from "axios";

export interface Transaction {
  date: string;
  memo?: string;
  amount: string;
  positive: boolean;
  pending: boolean;
}

export interface Event {
  name: string;
  description?: string;
  balance?: string;
  transactions?: Transaction[];
}

export async function fetchEvent(slug: string): Promise<Event> {
  const { data: event } = await axios(
    `https://hcb.hackclub.com/api/v3/organizations/${slug}`
  );
  const { data: transactions } = await axios(
    `https://hcb.hackclub.com/api/v3/organizations/${slug}/transactions`
  );

  return {
    name: event.name,
    balance: (event.balances.balance_cents / 100).toLocaleString("en", {
      style: "currency",
      currency: "USD",
    }),
    description: event.public_message,
    transactions: transactions.map(
      (transaction: any): Transaction => ({
        memo: transaction.memo,
        date: transaction.date,
        amount: (transaction.amount_cents / 100).toLocaleString("en", {
          style: "currency",
          currency: "USD",
        }),
        positive: transaction.amount_cents > 0,
        pending: transaction.pending,
      })
    ),
  };
}

// export async function fetchEvent(slug: string): Promise<Event> {
//   const { data } = await axios(`https://bank.hackclub.com/${slug}`, {
//     maxRedirects: 0,
//   });

//   const $ = cheerio.load(data);

//   const name = $(".app__sidebar h1").text().trim();
//   const transactions: Transaction[] = [];

//   $("table tbody tr").each(function () {
//     const amount = $(this).find(".transaction__memo + td").text().trim();
//     const memo = $(this)
//       .find(".transaction__memo span:first-of-type")
//       .text()
//       .trim();
//     const date = $(this).find("td:nth-of-type(2)").text().trim();

//     transactions.push({
//       date,
//       memo,
//       amount,
//       positive: !amount.startsWith("-"),
//     });
//   });

//   const balance = $(".stat__label:contains(balance) + .stat__value")
//     .text()
//     .trim();

//   const description = $(".public-message").text().trim();

//   return {
//     name,
//     balance: "$" + balance,
//     transactions,
//     description,
//   };
// }
