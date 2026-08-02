const express = require("express");
const path = require("path");
const fs = require("fs");
const Jimp = require("jimp");

const app = express();
const PORT = process.env.PORT || 3000;

// =========================
// CONFIGURAÇÕES GERAIS
// =========================
const CARD_W = 150;
const CARD_H = 210;

// Pastas
const CAMPOS_DIR = path.join(__dirname, "campos");
const CARTAS_DIR = path.join(__dirname, "cartas");

// =========================
// POSIÇÕES DAS CARTAS
// (centro da carta)
// =========================
const POSICOES = {
  "111": {
    gol:  { x: 540, y: 972 },
    def1: { x: 540, y: 760 },
    mei1: { x: 540, y: 528 },
    ata1: { x: 540, y: 286 }
  },

  "012": {
    gol:  { x: 540, y: 972 },
    mei1: { x: 540, y: 528 },
    ata1: { x: 388, y: 285 },
    ata2: { x: 692, y: 285 }
  },

  "201": {
    gol:  { x: 540, y: 972 },
    def1: { x: 348, y: 760 },
    def2: { x: 732, y: 760 },
    ata1: { x: 540, y: 286 }
  },

  "021": {
    gol:  { x: 540, y: 972 },
    mei1: { x: 400, y: 615 },
    mei2: { x: 680, y: 615 },
    ata1: { x: 540, y: 286 }
  }
};

// =========================
// FUNÇÕES
// =========================
function caminhoCampo(formacao) {
  return path.join(CAMPOS_DIR, `${formacao}.png`);
}

function caminhoCarta(id) {
  return path.join(CARTAS_DIR, `${id}.png`);
}

async function sobreporCarta(base, idCarta, pos) {
  if (!idCarta || !pos) return;

  const arquivoCarta = caminhoCarta(idCarta);

  if (!fs.existsSync(arquivoCarta)) {
    throw new Error(`Carta não encontrada: ${idCarta}.png`);
  }

  const carta = await Jimp.read(arquivoCarta);
  carta.resize(CARD_W, CARD_H);

  const x = Math.round(pos.x - CARD_W / 2);
  const y = Math.round(pos.y - CARD_H / 2);

  base.composite(carta, x, y);
}

// =========================
// ROTA INICIAL
// =========================
app.get("/", (req, res) => {
  res.send(`
    <h2>Dream Team API</h2>
    <p>API online com sucesso.</p>
    <p>Use a rota <code>/time</code> com os parâmetros da formação.</p>

    <h3>Exemplos:</h3>

    <p><b>111</b></p>
    <code>/time?formacao=111&gol=009&def1=010&mei1=011&ata1=012</code>

    <p><b>201</b></p>
    <code>/time?formacao=201&gol=009&def1=010&def2=008&ata1=012</code>

    <p><b>012</b></p>
    <code>/time?formacao=012&gol=009&mei1=011&ata1=012&ata2=006</code>

    <p><b>021</b></p>
    <code>/time?formacao=021&gol=009&mei1=011&mei2=005&ata1=012</code>
  `);
});

// =========================
// ROTA DE TESTE
// =========================
app.get("/health", (req, res) => {
  res.send("OK");
});

// =========================
// ROTA PRINCIPAL
// =========================
app.get("/time", async (req, res) => {
  try {
    const { formacao, gol, def1, def2, mei1, mei2, ata1, ata2 } = req.query;

    if (!formacao) {
      return res.status(400).send("Informe a formação. Exemplo: ?formacao=111");
    }

    if (!POSICOES[formacao]) {
      return res.status(400).send("Formação inválida. Use 111, 012, 201 ou 021.");
    }

    const arquivoCampo = caminhoCampo(formacao);

    if (!fs.existsSync(arquivoCampo)) {
      return res.status(404).send(`Campo não encontrado: ${formacao}.png`);
    }

    const base = await Jimp.read(arquivoCampo);

    // Ordem de desenho:
    // primeiro goleiro/defesa, depois meio, depois ataque
    await sobreporCarta(base, gol, POSICOES[formacao].gol);
    await sobreporCarta(base, def1, POSICOES[formacao].def1);
    await sobreporCarta(base, def2, POSICOES[formacao].def2);
    await sobreporCarta(base, mei1, POSICOES[formacao].mei1);
    await sobreporCarta(base, mei2, POSICOES[formacao].mei2);
    await sobreporCarta(base, ata1, POSICOES[formacao].ata1);
    await sobreporCarta(base, ata2, POSICOES[formacao].ata2);

    const buffer = await base.getBufferAsync(Jimp.MIME_PNG);

    res.set("Content-Type", "image/png");
    res.send(buffer);
  } catch (error) {
    console.error(error);
    res.status(500).send(`Erro ao gerar imagem: ${error.message}`);
  }
});

// =========================
// INICIAR SERVIDOR
// =========================
app.listen(PORT, () => {
  console.log(`Servidor rodando na porta ${PORT}`);
});