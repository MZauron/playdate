import { renderToStaticMarkup as html } from "react-dom/server";
import { describe, expect, it } from "vitest";
import { BottomTabs } from "./BottomTabs";
import { Button, ButtonLink } from "./Button";
import { Card } from "./Card";
import { Chip } from "./Chip";
import { NumberedStep } from "./NumberedStep";
import { FriendStatusLine, StatusLine } from "./StatusLine";
import { Toast } from "./Toast";
import { TwoPartSwitch } from "./TwoPartSwitch";

describe("Card", () => {
  it("is a white surface with 16 px corners and a soft shadow", () => {
    expect(html(<Card>Hi</Card>)).toMatch(/class="[^"]*rounded-card[^"]*bg-card[^"]*shadow-card[^"]*">Hi</);
  });
});

describe("Button", () => {
  it("is 50 px tall with 14 px corners in each variant", () => {
    for (const variant of ["main", "secondary", "destructive"] as const) {
      expect(html(<Button variant={variant}>Go</Button>)).toMatch(/h-\[50px\][^"]*rounded-button|rounded-button[^"]*h-\[50px\]/);
    }
  });
  it("is coral for main, teal on its tint for secondary, a red outline for destructive", () => {
    expect(html(<Button variant="main">Go</Button>)).toContain("bg-accent");
    expect(html(<Button variant="secondary">Go</Button>)).toContain("bg-primary-tint");
    expect(html(<Button variant="destructive">Go</Button>)).toContain("border-danger");
  });
  it("does not submit a form unless told to, and can be disabled", () => {
    expect(html(<Button>Go</Button>)).toContain('type="button"');
    expect(html(<Button type="submit" disabled>Go</Button>)).toMatch(/type="submit"[^>]*disabled|disabled[^>]*type="submit"/);
  });
  it("ButtonLink is a link that looks the same", () => {
    const markup = html(<ButtonLink href="/plan" variant="main">Plan</ButtonLink>);
    expect(markup).toContain('href="/plan"');
    expect(markup).toContain("h-[50px]");
  });
});

describe("Chip", () => {
  it("is at least 44 px tall and says whether it is selected", () => {
    expect(html(<Chip>Park</Chip>)).toContain("min-h-11");
    expect(html(<Chip>Park</Chip>)).toContain('aria-pressed="false"');
    expect(html(<Chip selected>Park</Chip>)).toContain('aria-pressed="true"');
    expect(html(<Chip selected>Park</Chip>)).toContain("bg-primary-tint");
  });
});

describe("StatusLine", () => {
  it("is coloured words, not a badge", () => {
    const markup = html(<StatusLine tone="success">Coming</StatusLine>);
    expect(markup).toContain("text-success");
    expect(markup).not.toMatch(/rounded|bg-/);
  });
  it("colours a friend's status: green coming and responded, red can't make it, grey waiting", () => {
    expect(html(<FriendStatusLine status={{ status: "coming" }} />)).toContain("text-success");
    expect(html(<FriendStatusLine status={{ status: "responded" }} />)).toContain("text-success");
    expect(html(<FriendStatusLine status={{ status: "cant_make_it", reason: "too_far" }} />)).toMatch(/text-danger[^>]*>Can&#x27;t make it · Too far for us</);
    expect(html(<FriendStatusLine status={{ status: "waiting" }} />)).toContain("text-muted");
  });
});

describe("NumberedStep", () => {
  it("is a coral numbered circle until it is done, then a teal tick", () => {
    const open = html(<NumberedStep number={2} title="When" />);
    expect(open).toContain("bg-accent");
    expect(open).toContain(">2<");
    const done = html(<NumberedStep number={2} done title="When" />);
    expect(done).toContain("bg-primary");
    expect(done).toContain("✓");
    expect(done).not.toContain("bg-accent");
  });
  it("shows what is inside the step", () => {
    expect(html(<NumberedStep number={1} title="Who's invited"><p>Dev</p></NumberedStep>)).toContain("<p>Dev</p>");
  });
});

describe("TwoPartSwitch", () => {
  const options = [
    { value: "set", label: "Pick date and time" },
    { value: "avail", label: "Share availability" },
  ] as const;
  it("shows both sides, the active one white, each at least 44 px", () => {
    const markup = html(<TwoPartSwitch label="How to choose a time" options={options} value="avail" onChange={() => {}} />);
    expect(markup).toContain('role="radiogroup"');
    expect(markup).toContain("Pick date and time");
    expect(markup).toContain("Share availability");
    expect(markup.match(/min-h-11/g)).toHaveLength(2);
    expect(markup).toMatch(/aria-checked="true"[^>]*bg-card[^>]*>Share availability/);
    expect(markup).toMatch(/aria-checked="false"[^>]*text-muted[^>]*>Pick date and time/);
  });
});

describe("Toast", () => {
  it("is a dark bar at the top that screen readers announce", () => {
    const markup = html(<Toast>Update sent</Toast>);
    expect(markup).toContain('role="status"');
    expect(markup).toContain("bg-ink");
    expect(markup).toContain("top-0");
  });
});

describe("BottomTabs", () => {
  it("has Home, Groups, Ask and Explore, each at least 44 px, linking to its screen", () => {
    const markup = html(<BottomTabs active="home" />);
    for (const [label, href] of [["Home", "/"], ["Groups", "/groups"], ["Ask", "/ask"], ["Explore", "/explore"]]) {
      expect(markup).toContain(`href="${href}"`);
      expect(markup).toContain(`>${label}<`);
    }
    expect(markup.match(/min-h-14/g)).toHaveLength(4);
  });
  it("marks only the active tab", () => {
    const markup = html(<BottomTabs active="ask" />);
    expect(markup.match(/aria-current="page"/g)).toHaveLength(1);
    expect(markup).toMatch(/href="\/ask"[^>]*aria-current="page"|aria-current="page"[^>]*href="\/ask"/);
  });
  it("marks none when the screen is not a tab", () => {
    expect(html(<BottomTabs active={null} />)).not.toContain("aria-current");
  });
});
