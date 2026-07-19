"use client";

import { useMemo, useState } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { Copy, Check } from "lucide-react";
import { toast } from "sonner";

type Prize = {
  image: string;
  name: string;
  chips: string;
};

export default function MonthlyContestGenerator() {
  const [bannerImage, setBannerImage] = useState(
    "https://elysiancoffee.github.io/uploads/Apr-Contest-2026-main.png"
  );

  const [intro, setIntro] = useState(
    `Every month, E.C.O.N. will bring you a new activity to take part in. This may be anything from a roleplay to some puzzles to a game of mafia. And this month, it is mafia trivia!

Crimes have been comitted through eras and ages. And so does the mafia families were historically formed. Mafia families have deep rooted histories as well. And this month, we're testing you for that!`
  );

  const [task, setTask] = useState(
    `On set dates during the months, rounds of trivia will be posted in THIS thread. All you have to do is answer them 100% correctly to earn a participation ticket, one ticket towards the prizes below and one black chip; per correct round.

We advise you to watch this thread to not miss any new rounds as every round will only be open for 72 hours (3 days approx~). The amount of rounds and their dates will not be disclosed beforehand.`
  );

  const [endDate, setEndDate] = useState("30th April 2026");
  const [submissionLink, setSubmissionLink] = useState(
    "https://www.hexrpg.com/f/315333/251033"
  );
  const [blackArchiveLink, setBlackArchiveLink] = useState(
    "https://www.hexrpg.com/f/315333/254093"
  );

  const [contact1Name, setContact1Name] = useState("Cleo");
  const [contact1Username, setContact1Username] = useState("hermione_ginny23310");
  const [contact2Name, setContact2Name] = useState("Nyx");
  const [contact2Username, setContact2Username] = useState("Pearl Peverell");
  const [contact3Name, setContact3Name] = useState("Simone");
  const [contact3Username, setContact3Username] = useState("Ri");

  const [prizes, setPrizes] = useState<Prize[]>([
    { image: "", name: "TBD", chips: "5" },
    { image: "", name: "TBD", chips: "4" },
    {
      image: "https://img.hexrpg.com/images/items/lepgold.gif",
      name: "1,000,000 Galleons",
      chips: "3",
    },
    {
      image: "https://img.hexrpg.com/images/items/lepgold.gif",
      name: "500,000 Galleons",
      chips: "2",
    },
    { image: "", name: "", chips: "1" },
  ]);

  const [copied, setCopied] = useState(false);

  const updatePrize = (
    index: number,
    field: keyof Prize,
    value: string
  ) => {
    setPrizes((current) =>
      current.map((prize, i) =>
        i === index ? { ...prize, [field]: value } : prize
      )
    );
  };

  const generatedCode = useMemo(() => {
    const positions = ["First", "Second", "Third", "Fourth", "Fifth"];

    const prizeCode = prizes
      .map((prize, index) => {
        const image = prize.image.trim()
          ? `[img width=30]${prize.image.trim()}[/img] `
          : "";

        const name = prize.name.trim()
          ? `${prize.name.trim()}${prize.chips.trim() ? " & " : ""}`
          : "";

        const chips = prize.chips.trim()
          ? `${prize.chips.trim()} Black ${prize.chips.trim() === "1" ? "Chip" : "Chips"}`
          : "";

        return `${positions[index]}: ${image}${name}${chips}`;
      })
      .join("\n");

    return `[center][img]${bannerImage}[/img]

[color=#f9f9f9][i]${intro}[/i] [/color]

[color=#cecac6][size=4][b]TASK[/b][/size][/color]

[color=#736d65]${task}[/color]

[color=#e2e2e2][size=4][b]RULES[/b][/size][/color][/center]
[color=#736d65]+ All HEX Terms must be followed.
+ This monthly contest will run until ${endDate},11:59pm HEX.
+ For each 100% correct entry, you will receive one (1) ticket towards drawing of the prizes below.
+ If you make a mistake in more than one rounds, only one participation ticket will be awarded for those rounds, combined.
+ Submit your entries in [url=${submissionLink}]this hidden replies thread[/url].
+ All vaid entries will receive [b]one Black Chip[/b] toward the [url=${blackArchiveLink}]Black Archive[/url] incentive.
+ Any questions can be owled to [url=/owl/${contact1Username}]${contact1Name}[/url], [url=/owl/${contact2Username}]${contact2Name}[/url] or [url=/owl/${contact3Username}]${contact3Name}[/url].[/color]

[center][color=#e2e2e2][size=4][b]PRIZES[/b][/size][/color]

[color=#736d65]${prizeCode}[/color][/center]

[size=2][color=white]Edited by hermione_ginny23310[/color][/size]`;
  }, [
    bannerImage,
    intro,
    task,
    endDate,
    submissionLink,
    blackArchiveLink,
    contact1Name,
    contact1Username,
    contact2Name,
    contact2Username,
    contact3Name,
    contact3Username,
    prizes,
  ]);

  const copyCode = async () => {
    await navigator.clipboard.writeText(generatedCode);
    setCopied(true);
    toast.success("Code copied to clipboard.");

    setTimeout(() => {
      setCopied(false);
    }, 2000);
  };

  return (
    <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 items-start">
      <Card>
        <CardHeader>
          <CardTitle>Monthly Contest Generator</CardTitle>
        </CardHeader>

        <CardContent className="space-y-6">
          <div className="space-y-2">
            <Label>Banner Image</Label>
            <Input
              value={bannerImage}
              onChange={(e) => setBannerImage(e.target.value)}
              placeholder="Banner image URL"
            />
          </div>

          <div className="space-y-2">
            <Label>Introduction</Label>
            <Textarea
              value={intro}
              onChange={(e) => setIntro(e.target.value)}
              className="min-h-[150px]"
            />
          </div>

          <div className="space-y-2">
            <Label>Task</Label>
            <Textarea
              value={task}
              onChange={(e) => setTask(e.target.value)}
              className="min-h-[150px]"
            />
          </div>

          <div className="space-y-2">
            <Label>Contest End Date</Label>
            <Input
              value={endDate}
              onChange={(e) => setEndDate(e.target.value)}
              placeholder="e.g. 30th April 2026"
            />
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label>Submission Thread Link</Label>
              <Input
                value={submissionLink}
                onChange={(e) => setSubmissionLink(e.target.value)}
              />
            </div>

            <div className="space-y-2">
              <Label>Black Archive Link</Label>
              <Input
                value={blackArchiveLink}
                onChange={(e) => setBlackArchiveLink(e.target.value)}
              />
            </div>
          </div>

          <div className="space-y-4">
            <Label>Contact Users</Label>

            <div className="grid grid-cols-2 gap-3">
              <Input
                value={contact1Name}
                onChange={(e) => setContact1Name(e.target.value)}
                placeholder="Display name"
              />
              <Input
                value={contact1Username}
                onChange={(e) => setContact1Username(e.target.value)}
                placeholder="HEX username"
              />

              <Input
                value={contact2Name}
                onChange={(e) => setContact2Name(e.target.value)}
                placeholder="Display name"
              />
              <Input
                value={contact2Username}
                onChange={(e) => setContact2Username(e.target.value)}
                placeholder="HEX username"
              />

              <Input
                value={contact3Name}
                onChange={(e) => setContact3Name(e.target.value)}
                placeholder="Display name"
              />
              <Input
                value={contact3Username}
                onChange={(e) => setContact3Username(e.target.value)}
                placeholder="HEX username"
              />
            </div>
          </div>

          <div className="space-y-4">
            <Label>Prizes</Label>

            {prizes.map((prize, index) => (
              <div key={index} className="space-y-2 rounded-lg border p-3">
                <div className="text-sm font-medium">
                  {["First", "Second", "Third", "Fourth", "Fifth"][index]}
                </div>

                <Input
                  value={prize.image}
                  onChange={(e) =>
                    updatePrize(index, "image", e.target.value)
                  }
                  placeholder="Prize image URL (optional)"
                />

                <div className="grid grid-cols-[1fr_100px] gap-3">
                  <Input
                    value={prize.name}
                    onChange={(e) =>
                      updatePrize(index, "name", e.target.value)
                    }
                    placeholder="Prize name"
                  />

                  <Input
                    type="number"
                    value={prize.chips}
                    onChange={(e) =>
                      updatePrize(index, "chips", e.target.value)
                    }
                    placeholder="Chips"
                  />
                </div>
              </div>
            ))}
          </div>
        </CardContent>
      </Card>

      <Card className="lg:sticky lg:top-6">
        <CardHeader className="flex flex-row items-center justify-between">
          <CardTitle>Generated Code</CardTitle>

          <Button variant="outline" size="sm" onClick={copyCode}>
            {copied ? (
              <Check className="mr-2 h-4 w-4" />
            ) : (
              <Copy className="mr-2 h-4 w-4" />
            )}
            {copied ? "Copied" : "Copy"}
          </Button>
        </CardHeader>

        <CardContent>
          <Textarea
            value={generatedCode}
            readOnly
            className="min-h-[800px] font-mono text-xs"
          />
        </CardContent>
      </Card>
    </div>
  );
}