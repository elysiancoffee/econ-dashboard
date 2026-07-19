"use client";

import { useMemo, useState } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Copy, Check } from "lucide-react";
import { toast } from "sonner";

type Item = {
  link: string;
  name: string;
};

function formatDateToOrdinal(dateStr: string): string {
  if (!dateStr) return "";
  const dateObj = new Date(dateStr + "T00:00:00");
  if (isNaN(dateObj.getTime())) return dateStr;

  const day = dateObj.getDate();
  const monthNames = [
    "January", "February", "March", "April", "May", "June",
    "July", "August", "September", "October", "November", "December"
  ];
  const monthName = monthNames[dateObj.getMonth()];

  // Calculate ordinal suffix (st, nd, rd, th)
  let ordinal = "th";
  if (day === 1 || day === 21 || day === 31) {
    ordinal = "st";
  } else if (day === 2 || day === 22) {
    ordinal = "nd";
  } else if (day === 3 || day === 23) {
    ordinal = "rd";
  }

  return `${monthName} ${day}${ordinal}`;
}

export default function ItemPollGenerator() {
  const [theme, setTheme] = useState("");
  const [date, setDate] = useState("");
  const [copied, setCopied] = useState(false);
  const [round, setRound] = useState("");

  const [items, setItems] = useState<Item[]>(
    Array.from({ length: 10 }, () => ({
      link: "",
      name: "",
    }))
  );

  const updateItem = (
    index: number,
    field: keyof Item,
    value: string
  ) => {
    setItems((current) =>
      current.map((item, i) =>
        i === index
          ? { ...item, [field]: value }
          : item
      )
    );
  };

  const generatedCode = useMemo(() => {
    // Skip an item only when BOTH fields are empty
    const itemCode = items
      .filter(
        (item) =>
          item.link.trim() !== "" ||
          item.name.trim() !== ""
      )
      .map(
        (item) =>
`[img]${item.link.trim()}[/img]
${item.name.trim()}`
      )
      .join("\n\n");

    const formattedDate = date ? formatDateToOrdinal(date) : "[Date]";

    return `[center]
[img]https://elysiancoffee.github.io/uploads/item-poll-june26.gif[/img]

[b][size=4][color=#9d953e]ROUND ${round}[/color][/size][/b]
[color=#4f6f9d]${theme}[/color]

[hr][size=3][b][color=#9d953e]NOTE [/color][/size][/b]

[color=#bcbcbc]1. Please vote for only 3 items. If more than 3 items are picked, your vote will be considered invalid.
2. This poll is open to both the club's admin team and members. However, the admin team will not be eligible to win any rewards from the item polls.
3. Do not share your votes with others, but discussion is allowed in the [url=/f/315333/244168]Mafiosi Chat Thread[/url].
4. You can visit the [url=https://www.hexrpg.com/f/315333/250881/]Price Check Thread[/url] for further information.
5. The three most-voted items will be posted in this thread.[/color]

[hr][b][size=3][color=#9d953e]THINGS TO KEEP IN MIND WHEN VOTING [/color][/size][/b]

[color=#bcbcbc]1. How many were searching for that particular item?
2. The number of bids received in an auction (both general and silent).
3. The price collectors are willing to pay for the item.
4. How many copies are left available for trading/selling?
5. The category of the item. Is it a canon/character/action/specific collection item? Or all of the categories?
6. The price inflation or deflation of the item for the past week or so.

If you're unsure on how to search threads or auctions, please refer to [url=https://www.hexrpg.com/knowledge/5#section2]this section of Knowledge Base.[/url][/color]

[hr][b][size=3][color=#9d953e]LIST OF ITEMS [/color][/size][/b]

[color=#bcbcbc]${itemCode}
[/color]

[hr][color=#4f6f9d]Submit your votes in [url=https://docs.google.com/forms/d/e/1FAIpQLSeHGsemi3dKwIJ7o_K5pp9sOc6SCxF5KnhthEt-JVvyRlWZmQ/viewform]this form![/url] Voting will close on ${formattedDate} at 11:59 PM.

If you are unable to access the form, please post your entries in [url=/f/315333/250762]this hidden replies thread.[/url]

If you have any feedback or suggestions for items or themes for future polls, feel free to leave your thoughts in the [url=https://www.hexrpg.com/f/315333/252036]Club's Suggestion Thread.[/url][/color][/center]`;
  }, [theme, date, items, round]);

  const copyCode = async () => {
    await navigator.clipboard.writeText(generatedCode);

    setCopied(true);
    toast.success("Code copied to clipboard.");

    setTimeout(() => {
      setCopied(false);
    }, 2000);
  };

  return (
    <div className="space-y-6 grid lg:grid-cols-2 grid-cols-1 gap-4">
      <Card>
        <CardHeader>
          <CardTitle>Item Poll New Round Generator</CardTitle>
        </CardHeader>

        <CardContent className="space-y-6">
          {/* Theme */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div className="space-y-2">
                <Label>Theme</Label>
                <Input
                value={theme}
                onChange={(e) => setTheme(e.target.value)}
                placeholder="e.g. Draco Malfoy"
                />
            </div>

            <div className="space-y-2">
                <Label>Round Number</Label>
                <Input
                type="number"
                value={round}
                onChange={(e) => setRound(e.target.value)}
                placeholder="e.g. 61"
                />
            </div>
        </div>

          {/* Items Table */}
          <div className="space-y-2">
            <Label className="text-sm font-semibold">Items List</Label>
            <div className="overflow-x-auto rounded-lg border border-border/60">
              <table className="w-full text-sm text-left">
                <thead className="bg-muted/40 font-semibold text-muted-foreground border-b border-border/60">
                  <tr>
                    <th className="px-3 py-2 text-center w-16">SR NO</th>
                    <th className="px-3 py-2">LINK</th>
                    <th className="px-3 py-2">NAME</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-border/40">
                  {items.map((item, index) => (
                    <tr key={index} className="hover:bg-muted/5 transition-colors">
                      <td className="px-3 py-2 text-center font-medium text-muted-foreground">
                        {index + 1}
                      </td>
                      <td className="px-3 py-1.5">
                        <Input
                          value={item.link}
                          onChange={(e) =>
                            updateItem(index, "link", e.target.value)
                          }
                          placeholder="https://img.hexrpg.com/..."
                          className="bg-transparent border-none focus-visible:ring-1 focus-visible:ring-primary/40 focus-visible:ring-offset-0 h-8 text-xs"
                        />
                      </td>
                      <td className="px-3 py-1.5">
                        <Input
                          value={item.name}
                          onChange={(e) =>
                            updateItem(index, "name", e.target.value)
                          }
                          placeholder="Item name"
                          className="bg-transparent border-none focus-visible:ring-1 focus-visible:ring-primary/40 focus-visible:ring-offset-0 h-8 text-xs"
                        />
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>

          {/* Date Picker */}
          <div className="space-y-2">
            <Label>Voting Close Date</Label>
            <Input
              type="date"
              value={date}
              onChange={(e) => setDate(e.target.value)}
            />
          </div>
        </CardContent>
      </Card>

      {/* Generated Code */}
      <Card>
        <CardHeader className="flex flex-row items-center justify-between">
          <CardTitle>Generated Code</CardTitle>

          <Button
            variant="outline"
            size="sm"
            onClick={copyCode}
          >
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
            className="min-h-[400px] font-mono text-xs"
          />
        </CardContent>
      </Card>
    </div>
  );
}