import { AppShell, Navigation } from "@/app/components/tds";

const METRIC_SKELETONS = ["value", "change", "return", "dividend"];
const LIST_SKELETONS = ["first", "second", "third", "fourth", "fifth"];
const CHART_BARS = [38, 58, 44, 72, 54, 82, 66];

function MiniChartSkeleton() {
  return (
    <div className="skeleton-mini-chart">
      {CHART_BARS.map((height, index) => (
        <span key={index} style={{ height: `${height}%` }} />
      ))}
    </div>
  );
}

export default function Loading() {
  return (
    <AppShell className="home-shell loading-skeleton">
      <Navigation />
      <p className="visually-hidden" role="status">최신 포트폴리오와 배당 정보를 불러오는 중입니다.</p>

      <div aria-busy="true" aria-hidden="true">
        <section className="skeleton-hero">
          <div>
            <span className="skeleton-block skeleton-eyebrow" />
            <span className="skeleton-block skeleton-title" />
            <span className="skeleton-block skeleton-copy" />
          </div>
          <div className="skeleton-actions">
            <span className="skeleton-block" />
            <span className="skeleton-block" />
            <span className="skeleton-block" />
          </div>
        </section>

        <section className="grid four skeleton-metrics">
          {METRIC_SKELETONS.map((metric, index) => (
            <article className="metric skeleton-metric" key={metric}>
              <span className="skeleton-block skeleton-label" />
              <span className="skeleton-block skeleton-value" />
              {index > 0 ? <MiniChartSkeleton /> : <span className="skeleton-block skeleton-value-tail" />}
            </article>
          ))}
        </section>

        <div className="skeleton-section-heading">
          <span className="skeleton-block skeleton-heading" />
          <span className="skeleton-block skeleton-heading-copy" />
        </div>

        <div className="home-dashboard-grid skeleton-dashboard">
          <aside className="home-dashboard-aside">
            <section className="panel skeleton-composition">
              <span className="skeleton-block skeleton-panel-title" />
              <div className="skeleton-composition-body">
                <div className="skeleton-ring" />
                <div className="skeleton-legend">
                  {LIST_SKELETONS.slice(0, 4).map((item) => (
                    <span className="skeleton-block" key={item} />
                  ))}
                </div>
              </div>
            </section>

            <section className="list skeleton-notices">
              {LIST_SKELETONS.slice(0, 3).map((item) => (
                <div className="list-row" key={item}>
                  <div>
                    <span className="skeleton-block skeleton-row-title" />
                    <span className="skeleton-block skeleton-row-copy" />
                  </div>
                  <span className="skeleton-block skeleton-row-action" />
                </div>
              ))}
            </section>
          </aside>

          <section className="list home-holdings-list skeleton-holdings">
            {LIST_SKELETONS.map((item) => (
              <div className="list-row" key={item}>
                <div>
                  <span className="skeleton-block skeleton-row-title" />
                  <span className="skeleton-block skeleton-row-copy" />
                </div>
                <div className="skeleton-holding-chart">
                  <MiniChartSkeleton />
                  <span className="skeleton-block skeleton-price" />
                </div>
              </div>
            ))}
          </section>
        </div>
      </div>
    </AppShell>
  );
}
