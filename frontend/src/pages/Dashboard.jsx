import { useState, useEffect } from "react";
import { Spinner, Alert, Row, Col, Card, Form } from "react-bootstrap";
import {
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  Legend,
  ResponsiveContainer,
} from "recharts";
import { apiFetch } from "../api";

const money = (n) =>
  `$${Number(n).toLocaleString(undefined, {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  })}`;

const monthLabel = (ym) => {
  const [y, m] = ym.split("-");
  return new Date(Number(y), Number(m) - 1, 1).toLocaleDateString(undefined, {
    month: "short",
    year: "numeric",
  });
};

export default function Dashboard() {
  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [selectedMonth, setSelectedMonth] = useState("all");
  const [hideAmounts, setHideAmounts] = useState(
    () => localStorage.getItem("invoiceme_hideAmounts") === "true",
  );

  useEffect(() => {
    apiFetch("/dashboard")
      .then((d) => {
        setData(d);
        if (d.byMonth.length > 0) {
          // default to the most recent month
          setSelectedMonth(d.byMonth[d.byMonth.length - 1].month);
        }
      })
      .catch((err) => setError(err.message))
      .finally(() => setLoading(false));
  }, []);

  function toggleHide() {
    setHideAmounts((prev) => {
      const next = !prev;
      localStorage.setItem("invoiceme_hideAmounts", String(next));
      return next;
    });
  }

  if (loading) return <Spinner animation="border" />;
  if (error) return <Alert variant="danger">{error}</Alert>;

  const { totals, byMonth } = data;

  // figures shown in the cards: a single month, or the all-time totals
  const view =
    selectedMonth === "all"
      ? totals
      : (byMonth.find((m) => m.month === selectedMonth) ?? {
          billed: 0,
          collected: 0,
          outstanding: 0,
        });

  const display = (n) => (hideAmounts ? "••••••" : money(n));

  const showing =
    selectedMonth === "all" ? "all time" : monthLabel(selectedMonth);

  return (
    <div>
      <div className="d-flex justify-content-between align-items-center mb-3 flex-wrap gap-2">
        <h1 className="h3 mb-0">Dashboard</h1>
        <div className="d-flex align-items-center gap-3">
          <Form.Check
            type="switch"
            id="hideAmounts"
            label="Hide amounts"
            checked={hideAmounts}
            onChange={toggleHide}
          />
          <Form.Select
            className="w-auto"
            value={selectedMonth}
            onChange={(e) => setSelectedMonth(e.target.value)}
            aria-label="Filter totals by month"
          >
            <option value="all">All time</option>
            {[...byMonth].reverse().map((m) => (
              <option key={m.month} value={m.month}>
                {monthLabel(m.month)}
              </option>
            ))}
          </Form.Select>
        </div>
      </div>

      <p className="text-muted">Showing {showing}</p>

      <Row className="mb-4">
        <Col md={4} className="mb-3 mb-md-0">
          <Card className="h-100">
            <Card.Body>
              <Card.Subtitle className="text-muted mb-1">Billed</Card.Subtitle>
              <div className="h4 mb-0">{display(view.billed)}</div>
            </Card.Body>
          </Card>
        </Col>
        <Col md={4} className="mb-3 mb-md-0">
          <Card className="h-100">
            <Card.Body>
              <Card.Subtitle className="text-muted mb-1">
                Collected
              </Card.Subtitle>
              <div className="h4 mb-0 text-success">
                {display(view.collected)}
              </div>
            </Card.Body>
          </Card>
        </Col>
        <Col md={4}>
          <Card className="h-100">
            <Card.Body>
              <Card.Subtitle className="text-muted mb-1">
                Outstanding
              </Card.Subtitle>
              <div className="h4 mb-0 text-warning">
                {display(view.outstanding)}
              </div>
            </Card.Body>
          </Card>
        </Col>
      </Row>

      <Card>
        <Card.Body>
          <Card.Subtitle className="text-muted mb-3">
            Billed vs collected by month
          </Card.Subtitle>
          {byMonth.length === 0 ? (
            <p className="text-muted mb-0">
              No issued invoices yet — issue an invoice to see your earnings
              here.
            </p>
          ) : (
            <ResponsiveContainer width="100%" height={320}>
              <BarChart data={byMonth}>
                <CartesianGrid strokeDasharray="3 3" />
                <XAxis dataKey="month" tickFormatter={monthLabel} />
                <YAxis tickFormatter={(v) => (hideAmounts ? "" : v)} />
                <Tooltip
                  formatter={(value) => (hideAmounts ? "••••" : money(value))}
                  labelFormatter={monthLabel}
                />
                <Legend />
                <Bar
                  dataKey="collected"
                  name="Collected"
                  stackId="a"
                  fill="#198754"
                />
                <Bar
                  dataKey="outstanding"
                  name="Outstanding"
                  stackId="a"
                  fill="#ffc107"
                />
              </BarChart>
            </ResponsiveContainer>
          )}
        </Card.Body>
      </Card>
    </div>
  );
}
