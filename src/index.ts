import "dotenv/config";

import { App, InputBlock, PlainTextInputAction } from "@slack/bolt";
import { fetchEvent } from "./bank";
import renderEvent from "./eventRenderer";

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
      text: 'Try "hq", "wild-wild-west", or "zephyr"',
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
    text: "Project ID",
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
              text: ":x: oops, couldn't fetch that project",
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

(async () => {
  await app.start(process.env.PORT || 3000);
  console.log("App started!");
})();
