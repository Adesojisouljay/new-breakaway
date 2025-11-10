import express from "express";
import React from "react";
import { Provider } from "react-redux";
import { renderToString } from "react-dom/server";
import { StaticRouter } from "react-router-dom";
import { Helmet } from "react-helmet";
import serialize from "serialize-javascript";
import App from "../common/app";
import { AppState } from "../common/store";
import configureStore from "../common/store/configure";
import path from "path";
import { ChunkExtractor, ChunkExtractorManager } from "@loadable/server";
import { dehydrate, QueryClientProvider } from "@tanstack/react-query";
import { queryClient } from "../common/core";

export const render = (req: express.Request, state: AppState) => {
  const store = configureStore(state);

  // console.log("stpre.....", state)
  const context = {};

  // Loadable components
  const statsFile = path.resolve("./build/loadable-stats.json");
  const extractor = new ChunkExtractor({ statsFile, entrypoints: ["client"] });
  const dehydratedState = dehydrate(queryClient);

  // --- Detect community based on domain ---
  const hostname = req.hostname.toLowerCase();
  // console.log("hostname..", hostname)

  let communityTitle = state.global.communityTitle;
  let communityDescription =
    "Discover and build rewarding Web3 communities on Hive — powered by Breakaway.";
  let communityImage = `https://images.hive.blog/u/${state.global.hive_id}/avatar`;
  let communityUrl = `https://${hostname}/`;

  // --- Render React app to string ---
  const markup = renderToString(
    <ChunkExtractorManager extractor={extractor}>
      <Provider store={store}>
        <QueryClientProvider client={queryClient}>
          <StaticRouter location={req.originalUrl} context={context}>
            <App />
          </StaticRouter>
        </QueryClientProvider>
      </Provider>
    </ChunkExtractorManager>
  );

  const finalState = store.getState();
  const helmet = Helmet.renderStatic();

  // --- Inject custom head meta for this community ---
  const headHelmet = `
    <title data-react-helmet="true">${communityTitle}</title>
    <meta data-react-helmet="true" name="description" content="${communityDescription}" />
    <meta data-react-helmet="true" property="og:title" content="${communityTitle}" />
    <meta data-react-helmet="true" property="og:description" content="${communityDescription}" />
    <meta data-react-helmet="true" property="og:image" content="${communityImage}" />
    <meta data-react-helmet="true" property="og:url" content="${communityUrl}" />
    <meta data-react-helmet="true" property="og:type" content="website" />
    <meta data-react-helmet="true" name="twitter:card" content="summary_large_image" />
    <meta data-react-helmet="true" name="twitter:title" content="${communityTitle}" />
    <meta data-react-helmet="true" name="twitter:description" content="${communityDescription}" />
    <meta data-react-helmet="true" name="twitter:image" content="${communityImage}" />
    ${helmet.meta.toString()}
    ${helmet.link.toString()}
  `;

  const scriptTags = extractor.getScriptTags();
  const linkTags = extractor.getLinkTags();
  const styleTags = extractor.getStyleTags();

  // --- Clear query cache ---
  queryClient.clear();

  console.log("communityTitle....", communityTitle)
  console.log("communityDescription....", communityDescription)
  console.log("communityImage....", communityImage)
  console.log("communityUrl....", communityUrl)

  // --- Return full HTML ---
  return `<!DOCTYPE html>
<html lang="en">
  <head>
    <meta charset="utf-8" />
    <meta name="viewport" content="width=device-width, initial-scale=1" />
    <meta name="theme-color" content="#000000" />
    <link rel="icon" href=${communityImage} />
    <link rel="apple-touch-icon" href=${communityImage} />
    <link rel="manifest" href="/manifest.json" />
    ${headHelmet}
    ${linkTags}
    ${styleTags}
    <style>
      *::before, *::after { box-sizing: border-box; }

      .ecency-global-loader {
        display: flex; align-items: center; justify-content: center;
        flex-direction: column; height: 100%; width: 100%;
        z-index: 100; position: fixed; background-color: #fff;
        top: 0; left: 0; transition: 0.4s;
      }

      .dark .ecency-global-loader { background: #161d26; }

      .ecency-global-loader.ecency-global-loader-hidden {
        opacity: 0; visibility: hidden; transform: scale(2);
      }

      .ecency-global-loader-spinner {
        position: relative; height: 112px; width: 112px;
      }

      .ecency-global-loader-spinner:before,
      .ecency-global-loader-spinner:after {
        border-radius: 50%; content: ''; position: absolute;
      }

      .ecency-global-loader-spinner:before {
        background: #474bff;
        height: 22.4px; width: 22.4px;
        top: 50%; left: 50%; transform: translate(-50%, -50%);
      }

      .ecency-global-loader-spinner:after {
        animation: pulse-t3pv1p 1.5s infinite;
        border: 11.2px solid #474bff; height: 100%; width: 100%;
      }

      @keyframes pulse-t3pv1p {
        from { opacity: 1; transform: scale(0); }
        to { opacity: 0; transform: scale(1); }
      }

      .ecency-global-loader-title {
        font-family: -apple-system, Helvetica, "Segoe UI", sans-serif;
        font-weight: bold; text-transform: uppercase;
        letter-spacing: 0.5rem; color: #404f66;
      }
    </style>
  </head>
  <body class="${state.global.theme === "night" ? "dark" : ""}">
    <div id="root">${markup}</div>
    <div class="ecency-global-loader">
      <div class="ecency-global-loader-spinner"></div>
      <div class="ecency-global-loader-title">${communityTitle}</div>
    </div>
    <script>
      window.__PRELOADED_STATE__ = ${serialize(finalState)};
      window.__REACT_QUERY_STATE__ = ${serialize(dehydratedState)};
    </script>
    ${scriptTags}
    <script type="application/ld+json">
      {
        "@context": "https://schema.org",
        "@type": "WebSite",
        "url": "${communityUrl}",
        "potentialAction": [{
          "@type": "SearchAction",
          "target": {
            "@type": "EntryPoint",
            "urlTemplate": "${communityUrl}search/?q={search_term_string}"
          },
          "query-input": "required name=search_term_string"
        }]
      }
    </script>
    <style> body { display: block !important; } </style>
  </body>
</html>`;
};
