import { BirdClient } from "@messagebird/sdk";

// Key and recipient come from .env (not committed to git).
const apiKey = process.env.BIRD_API_KEY;
const to = process.env.BIRD_TO;
if (!apiKey || !to) {
  throw new Error("Set BIRD_API_KEY and BIRD_TO in bird-whatsapp/.env");
}

const bird = new BirdClient({ apiKey });

const msg = await bird.whatsapp.send({
  to,
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
