import { Block, KnownBlock, SectionBlock } from "@slack/bolt";
import { Event, Transaction } from "./bank";

export default function renderEvent(event: Event): (Block | KnownBlock)[] {
  return [
    {
      type: "header",
      text: {
        type: "plain_text",
        text: `${event.name} (:moneybag: ${event.balance})`,
        emoji: true,
      },
    },
    ...(event.description
      ? [
          <SectionBlock>{
            type: "section",
            text: {
              type: "mrkdwn",
              text: `>>> ${event.description}`,
            },
          },
        ]
      : []),
    ...event.transactions!.slice(0, 10).flatMap((tx) => renderTransaction(tx)),
  ];
}

function renderTransaction(tx: Transaction): (Block | KnownBlock)[] {
  return [
    {
      type: "divider",
    },
    {
      type: "section",
      fields: [
        {
          type: "mrkdwn",
          text: `${tx.date} - *${tx.memo}*`,
        },
        {
          type: "mrkdwn",
          text:
            (tx.positive ? ":large_green_circle: " : ":red_circle: ") +
            tx.amount,
        },
      ],
    },
  ];
}
