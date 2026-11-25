// Deploy rehearsal (rehearse.sh): send one demo request through the website the way a browser
// without JavaScript does. The page's form carries the server action's hidden fields; post them
// back with the visitor's answers. Prints the response status on the first line.
//
//   node demo-request.mjs http://site.localhost:8080/en 127.0.0.1:8080
//
// The second argument is where to connect (like curl --connect-to), so *.localhost names don't
// need to resolve. Node's own HTTP client, because fetch can't set the Host header.
import http from "node:http";

const [pageUrl, connectTo] = process.argv.slice(2);
const page = new URL(pageUrl);
const [connectHost, connectPort] = connectTo.split(":");

function send(method, headers = {}, body) {
  return new Promise((resolve, reject) => {
    const request = http.request(
      {
        host: connectHost,
        port: Number(connectPort),
        method,
        path: page.pathname,
        headers: { Host: page.host, ...headers },
        timeout: 30_000,
      },
      (response) => {
        const chunks = [];
        response.on("data", (chunk) => chunks.push(chunk));
        response.on("end", () => resolve({ status: response.statusCode, text: Buffer.concat(chunks).toString() }));
      },
    );
    request.on("error", reject);
    request.on("timeout", () => request.destroy(new Error("timeout")));
    request.end(body);
  });
}

const decode = (value) =>
  value.replace(/&quot;/g, '"').replace(/&#x27;/g, "'").replace(/&lt;/g, "<").replace(/&gt;/g, ">").replace(/&amp;/g, "&");

const html = (await send("GET")).text;
const form = html.match(/<form[^>]*method="POST"[^>]*>([\s\S]*?)<\/form>/)?.[1];
if (!form) throw new Error("no demo form on the page");

const fields = new FormData();
for (const [, attributes] of form.matchAll(/<input([^>]*)\/?>/g)) {
  const name = attributes.match(/\sname="([^"]*)"/)?.[1];
  const type = attributes.match(/\stype="([^"]*)"/)?.[1] ?? "text";
  if (!name || type === "radio" || type === "checkbox") continue;
  fields.set(decode(name), decode(attributes.match(/\svalue="([^"]*)"/)?.[1] ?? ""));
}
fields.set("name", "Rehearsal Visitor");
fields.set("phone", "+20 100 123 4567");
fields.set("company", "Rehearsal Realty");
fields.set("teamSize", "6-15");
fields.set("website", ""); // the honeypot stays empty

const encoded = new Request("http://encoder.invalid", { method: "POST", body: fields });
const body = Buffer.from(await encoded.arrayBuffer());
const response = await send(
  "POST",
  {
    Origin: page.origin, // as a browser sends it; Next checks it against the host
    "Content-Type": encoded.headers.get("content-type"),
    "Content-Length": String(body.length),
  },
  body,
);
console.log(response.status);
