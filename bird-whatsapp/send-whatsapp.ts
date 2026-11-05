import { BirdClient } from "@messagebird/sdk";

// TODO: replace "bk_xxxxxxxxx" with your real Bird API key
// (Bird dashboard -> Platform tools -> API keys, scope: whatsapp:write).
// Don't commit a real key to git.
const bird = new BirdClient({ apiKey: "bk_xxxxxxxxx" });

const msg = await bird.whatsapp.send({
  to: "+15551234567", // replace with the recipient's number in E.164 format
  template: {
    slug: "bird_delivery_update",
    components: [
      {
        type: "body",
        parameters: [
          { type: "text", name: "ref", text: "A1B2C3D4" },
          { type: "text", name: "date", text: "10 Jul 2026" },
        ],
      },
    ],
  },
});

console.log(msg.id, msg.status);
