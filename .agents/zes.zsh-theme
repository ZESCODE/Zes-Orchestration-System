# zes.zsh-theme — ZES System Theme (v3)
# Minimal prompt with ZES colors
#
# ╔═(#)~/home/path
# ║ 
# ╚══(cmd)>>>

setopt prompt_subst 2>/dev/null

function virtualenv_prompt_info {
  if [[ -n ${VIRTUAL_ENV} ]]; then
    echo "%{%F{81}%}(${VIRTUAL_ENV:t})%{%f%}"
  else
    echo "%{%F{81}%}(#)%{%f%}"
  fi
}

function zes_path_info {
  local dir="${(%):-%~}"
  if [[ "$dir" == "~" ]]; then
    echo ""
  else
    echo "${dir#\~}"
  fi
}

# Colors: 81=cyan, 196=red, 33=blue, 219=pink, 239=gray
PROMPT='%{%F{81}%}╔═%{%f%}$(virtualenv_prompt_info)%{%F{33}%}~%{%f%}%{%F{81}%}/home%{%f%}%{%F{33}%}$(zes_path_info)%{%f%}
%{%F{81}%}║%{%f%} 
%{%F{81}%}╚══%{%f%}%{%F{219}%}(%{%f%}%{%F{196}%}cmd%{%f%}%{%F{219}%})%{%f%}%{%F{81}%}>>>%{%f%} '

ZSH_THEME_GIT_PROMPT_PREFIX=" %{%F{239}%}on%{%f%} %{%F{255}%}"
ZSH_THEME_GIT_PROMPT_SUFFIX="%{%f%}"
ZSH_THEME_GIT_PROMPT_DIRTY=" %{%F{196}%}✘%{%f%}"
ZSH_THEME_GIT_PROMPT_CLEAN=" %{%F{46}%}✔%{%f%}"

export VIRTUAL_ENV_DISABLE_PROMPT=1
