import { useEffect, FC } from "react";

type TokenSelectorType = {
  open: boolean;
  items: any[];
  onSelect: (item: any) => void;
  onCancel: () => void;
}

export const TokenSelector: FC<TokenSelectorType> = ({ open, items = [], onSelect, onCancel }) => {
  useEffect(() => {
    if (open) {
      document.body.classList.add("overflow-hidden");
    } else {
      document.body.classList.remove("overflow-hidden");
    }
    return () => document.body.classList.remove("overflow-hidden"); // Очистка при размонтировании
  }, [open]);

  const handleSelect = (item: any) => {
    onSelect(item);
  }

  if(!open) return null;

  return (
    <div className="fixed top-0 bottom-0 left-0 right-0 z-50 h-full backdrop-blur">
      <div className="p-6 h-full">
        <div className="bg-mint-dark h-full rounded-2xl flex flex-col justify-between overflow-hidden">
          <div className="p-2 mt-0 h-16">
            <div>
              <input type="text" placeholder="Search token" className="w-full py-2 text-xl px-2 rounded-xl"/>
            </div>
          </div>
          <div className="overflow-scroll h-full flex flex-col gap-2 justify-start">
            {items.map((item: any) => {
              return (
                <div key={'token' + item.token_id} className="p-2 bg-mint mx-2" onClick={()=>handleSelect(item)}>
                  <div>
                    {item.symbol}
                  </div>
                  <div>
                    {item.symbol}
                  </div>
                </div>
              );
            })}
          </div>
          <div className="h-20 pt-2 px-2">
            <button className="w-full bg-mint py-3 rounded-xl" onClick={() => onCancel()}>Close</button>
          </div>
        </div>
      </div>
    </div>
  );
}
