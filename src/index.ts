import "dotenv/config";

import {
  App,
  ContextBlock,
  ImageElement,
  InputBlock,
  MrkdwnElement,
  PlainTextInputAction,
} from "@slack/bolt";
import { fetchEvent } from "./bank";
import renderEvent from "./eventRenderer";
import axios from "axios";

const app = new App({
  signingSecret: process.env.SLACK_SIGNING_SECRET,
  token: process.env.SLACK_TOKEN,
});

const searchBar = (slug?: string): InputBlock => ({
  type: "input",
  dispatch_action: true,
  element: {
    type: "plain_text_input",
    dispatch_action_config: {
      trigger_actions_on: ["on_enter_pressed"],
    },
    ...(slug ? { initial_value: slug } : {}),
    placeholder: {
      type: "plain_text",
      text: 'Try "hq", "zephyr", or "assemble"',
    },
    action_id: "slug",
    focus_on_load: true,
  },
  hint: {
    type: "plain_text",
    text: "The last part of the URL.",
  },
  label: {
    type: "plain_text",
    text: "Organization ID",
  },
});

const flavorTexts = [
  "beep boop boop...",
  "choo choo chew...",
  "powered by javascript!",
  "how does this even work?",
  "connecting to hack club bank...",
  "how long will this take?",
  "the ghosts are working very hard",
  "are you filled with determination?",
  "hacking the bank...",
  "this bank doesn't even have lollipops",
];

app.event("app_home_opened", async ({ event, client }) => {
  await client.views.publish({
    user_id: event.user,
    view: {
      type: "home",
      blocks: [searchBar()],
    },
  });
});

app.action("slug", async ({ ack, action, body, client }) => {
  await ack();

  const slug = (action as PlainTextInputAction).value.toLowerCase();

  const flavor = flavorTexts[Math.floor(Math.random() * flavorTexts.length)];

  await client.views.publish({
    user_id: body.user.id,
    view: {
      type: "home",
      blocks: [
        searchBar(slug),
        {
          type: "section",
          text: { type: "plain_text", text: `:loading: loading...` },
        },
        {
          type: "context",
          elements: [
            {
              type: "mrkdwn",
              text: flavor,
            },
          ],
        },
      ],
    },
  });

  try {
    const event = await fetchEvent(slug);

    await client.views.publish({
      user_id: body.user.id,
      view: {
        type: "home",
        blocks: [searchBar(slug), { type: "divider" }, ...renderEvent(event)],
      },
    });
  } catch (e) {
    await client.views.publish({
      user_id: body.user.id,
      view: {
        type: "home",
        blocks: [
          searchBar(slug),
          {
            type: "section",
            text: {
              type: "mrkdwn",
              text: ":x: oops, couldn't fetch that organization",
            },
          },
          {
            type: "section",
            text: {
              type: "mrkdwn",
              text: `\`\`\`${(e as any).toString()}\`\`\``,
            },
          },
        ],
      },
    });
  }
});

function renderUserList(slug: string, users: any[]): ContextBlock {
  if (users.length <= 10) {
    return {
      type: "context",
      elements: users.map(
        (user: any): ImageElement => ({
          type: "image",
          image_url: user.photo,
          alt_text: user.full_name,
        })
      ),
    };
  } else {
    return {
      type: "context",
      elements: [
        ...users.slice(0, 9).map(
          (user: any): ImageElement => ({
            type: "image",
            image_url: user.photo,
            alt_text: user.full_name,
          })
        ),
        {
          type: "mrkdwn",
          text: `<https://bank.hackclub.com/${slug}/team|and ${
            users.length - 9
          } more>`,
        },
      ],
    };
  }
}

app.event("link_shared", async ({ event, client }) => {
  const url = event.links[0].url;
  if (!url) return;

  const organizationMatch = url.match(
    /^https?:\/\/bank.hackclub.com\/([^\/]+)/
  );
  if (!organizationMatch) return;

  try {
    const { data: organization } = await axios(
      `https://bank.hackclub.com/api/v3/organizations/${organizationMatch[1]}`
    );
    const { data: transactions } = await axios(
      `https://bank.hackclub.com/api/v3/organizations/${organizationMatch[1]}/transactions`
    );

    const lastTransactionDate = new Date(
      transactions.sort(
        (a: { date: string }, b: { date: string }) =>
          new Date(b.date).getTime() - new Date(a.date).getTime()
      )[0].date
    ).toLocaleDateString("en", {
      dateStyle: "long",
      timeZone: "UTC",
    });

    await client.chat.unfurl({
      channel: event.channel,
      ts: event.message_ts,
      unfurls: {
        [url]: {
          blocks: [
            {
              type: "section",
              text: {
                type: "mrkdwn",
                text: `*<https://bank.hackclub.com/${organizationMatch[1]}|${organization.name}>* – Hack Club Bank`,
              },
              accessory: {
                type: "image",
                image_url:
                  organization.logo ||
                  "https://bank.hackclub.com/brand/hcb-icon-icon-dark.png",
                alt_text: organization.logo
                  ? organization.name
                  : "Hack Club Bank",
              },
              fields: [
                {
                  type: "mrkdwn",
                  text: `:money_with_wings: *Balance*\n${(
                    organization.balances.balance_cents / 100
                  ).toLocaleString("en", {
                    style: "currency",
                    currency: "USD",
                  })}`,
                },
                ...(transactions.length > 0
                  ? [
                      <MrkdwnElement>{
                        type: "mrkdwn",
                        text: `:calendar: *Last transaction*\n${lastTransactionDate}`,
                      },
                    ]
                  : []),
              ],
            },
            renderUserList(organizationMatch[1], organization.users),
          ],
        },
      },
    });
  } catch (e) {
    console.log(e);
  }
});

app.action("nothing", async ({ ack }) => await ack());

(async () => {
  await app.start(process.env.PORT || 3000);
  console.log("App started!");
})();
