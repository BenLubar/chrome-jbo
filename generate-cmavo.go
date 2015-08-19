package main

import (
	"encoding/xml"
	"fmt"
	"os"
	"sort"
	"strings"

	"regexp"

	"github.com/BenLubar/jbo/jbovlaste"
)

func main() {
	var dict jbovlaste.Dictionary
	err := xml.NewDecoder(os.Stdin).Decode(&dict)
	if err != nil {
		panic(err)
	}

	var selmaho []string
	selmahoValsi := make(map[string][]string)

	re := regexp.MustCompile(`\A[A-Zh]+`)

	for i := range dict.Direction[0].Valsi {
		valsi := &dict.Direction[0].Valsi[i]

		if valsi.Type == "cmavo" || valsi.Type == "experimental cmavo" {
			s := re.FindString(valsi.Selmaho)
			if s != "" && !strings.ContainsRune(valsi.Word, '.') {
				if len(selmahoValsi[s]) == 0 {
					selmaho = append(selmaho, s)
				}
				selmahoValsi[s] = append(selmahoValsi[s], valsi.Word)
			}
		}
	}

	sort.Sort(selmahoSort(selmaho))

	for _, s := range selmaho {
		fmt.Print(s, " = &cmavo expr:(")
		sort.Sort(pegSort(selmahoValsi[s]))
		for i, v := range selmahoValsi[s] {
			if i != 0 {
				fmt.Print(" /")
			}
			for j := range v {
				if v[j] == '\'' {
					fmt.Print(" h")
				} else {
					fmt.Print(" ", string(v[j]))
				}
			}
		}
		fmt.Print(" ) &post_word {return [\"", s, "\", _join(expr)];}\n\n")
	}
}

var yhy = strings.NewReplacer("h", "'")

type selmahoSort []string

func (s selmahoSort) Len() int      { return len(s) }
func (s selmahoSort) Swap(i, j int) { s[i], s[j] = s[j], s[i] }
func (s selmahoSort) Less(i, j int) bool {
	return strings.ToLower(yhy.Replace(s[i])) < strings.ToLower(yhy.Replace(s[j]))
}

type pegSort []string

func (s pegSort) Len() int      { return len(s) }
func (s pegSort) Swap(i, j int) { s[i], s[j] = s[j], s[i] }
func (s pegSort) Less(i, j int) bool {
	if len(s[i]) > len(s[j]) {
		return true
	}
	if len(s[i]) < len(s[j]) {
		return false
	}
	return s[i] < s[j]
}
