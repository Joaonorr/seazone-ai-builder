/* Apenas os pares `**` e `__`: o sublinhado isolado ocorre em dados do imóvel,
   como a rede `SeaHome_FLN001`. */
const emphasisMarkers = /\*\*|__/g;

/** Remove ênfase Markdown residual das respostas do assistente na renderização. */
export function stripMarkdownEmphasis(text: string) {
  return text.replace(emphasisMarkers, "");
}
