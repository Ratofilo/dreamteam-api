import express from "express";
import sharp from "sharp";
import path from "path";
import { fileURLToPath } from "url";
import fs from "fs/promises";

const app = express();

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const PORT = process.env.PORT || 3000;

const CARD_WIDTH = 260;
const CARD_HEIGHT = 360;

const FORMATIONS = {
  "111": {
    slots: {
      gol: { left: 510, top: 850 },
      def1: { left: 510, top: 580 },
      mei1: { left: 510, top: 310 },
      ata1: { left: 510, top: 40 }
    }
  },

  "201": {
    slots: {
      gol: { left: 510, top: 850 },
      def1: { left: 300, top: 560 },
      def2: { left: 720, top: 560 },
      ata1: { left: 510, top: 100 }
    }
  },

  "012": {
    slots: {
      gol: { left: 510, top: 850 },
      mei1: { left: 510, top: 510 },
      ata1: { left: 300, top: 100 },
      ata2: { left: 720, top: 100 }
    }
  },

  "021": {
    slots: {
      gol: { left: 510, top: 850 },
      mei1: { left: 300, top: 470 },
      mei2: { left: 720, top: 470 },
      ata1: { left: 510, top: 80 }
    }
  }
};

function cartaValida(id) {
  return typeof id === "string" && /^\d{3}$/.test(id);
}

async function criarCamadaCarta(cardId, position) {
  if (
    !cardId ||
    cardId === "0" ||
    cardId === "000" ||
    !cartaValida(cardId)
  ) {
    return null;
  }

  const cardPath = path.join(
    __dirname,
    "assets",
    "cartas",
    `${cardId}.png`
  );

  try {
    await fs.access(cardPath);
  } catch {
    throw new Error(`A carta ${cardId}.png não foi encontrada`);
  }

  const cardBuffer = await sharp(cardPath)
    .resize(CARD_WIDTH, CARD_HEIGHT, {
      fit: "contain",
      background: {
        r: 0,
        g: 0,
        b: 0,
        alpha: 0
      }
    })
    .png()
    .toBuffer();

  return {
    input: cardBuffer,
    left: position.left,
    top: position.top
  };
}

app.get("/", (req, res) => {
  res.json({
    status: "online",
    mensagem: "API DreamTeam funcionando",
    exemplo:
      "/time?formacao=111&gol=009&def1=010&mei1=011&ata1=012"
  });
});

app.get("/time", async (req, res) => {
  try {
    const {
      formacao,
      gol = "0",
      def1 = "0",
      def2 = "0",
      mei1 = "0",
      mei2 = "0",
      ata1 = "0",
      ata2 = "0"
    } = req.query;

    const formation = FORMATIONS[formacao];

    if (!formation) {
      return res.status(400).json({
        erro: "Formação inválida",
        formacoes_validas: ["111", "201", "012", "021"]
      });
    }

    const fieldPath = path.join(
      __dirname,
      "assets",
      "campos",
      `${formacao}.png`
    );

    try {
      await fs.access(fieldPath);
    } catch {
      return res.status(500).json({
        erro: `A imagem assets/campos/${formacao}.png não foi encontrada`
      });
    }

    const cartasSelecionadas = {
      gol,
      def1,
      def2,
      mei1,
      mei2,
      ata1,
      ata2
    };

    const layers = [];

    for (const [slotName, position] of Object.entries(formation.slots)) {
      const cardId = cartasSelecionadas[slotName];

      const layer = await criarCamadaCarta(cardId, position);

      if (layer) {
        layers.push(layer);
      }
    }

    const imagemFinal = await sharp(fieldPath)
      .composite(layers)
      .png()
      .toBuffer();

    res.setHeader("Content-Type", "image/png");
    res.setHeader("Cache-Control", "no-store");

    return res.send(imagemFinal);
  } catch (error) {
    console.error(error);

    return res.status(500).json({
      erro: "Não foi possível gerar o time",
      detalhe: error.message
    });
  }
});

app.listen(PORT, "0.0.0.0", () => {
  console.log(`API DreamTeam online na porta ${PORT}`);
});